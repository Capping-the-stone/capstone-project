import os
import pandas as pd
import numpy as np

def load_log_file(filepath):
    try:
        df = pd.read_csv(
            filepath,
            header=None,
            names=[
                "userID", "currentQuestionIndex", "editorContentBefore", "editorContentAfter",
                "timestamp", "isPaste", "isDeletion", "isCompilation", "isSubmission"
            ],
            quotechar='"',
            escapechar='\\',
            doublequote=False,
            engine='python',
            on_bad_lines='warn',
            dtype=str
        )

        df.dropna(subset=["timestamp", "editorContentAfter"], inplace=True)
        df["timestamp"] = pd.to_numeric(df["timestamp"], errors='coerce')
        df.dropna(subset=["timestamp"], inplace=True)
        df["timestamp"] = df["timestamp"].astype(int)

        bool_cols = ["isPaste", "isDeletion", "isCompilation", "isSubmission"]
        for col in bool_cols:
            df[col] = df[col].fillna("False").str.strip().str.lower().map({"true": True, "false": False})
            df[col] = df[col].fillna(False)

        df["editorContentBefore"] = df["editorContentBefore"].fillna("").astype(str)
        df["editorContentAfter"] = df["editorContentAfter"].fillna("").astype(str)

        return df

    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return pd.DataFrame()


def compute_rji(df, bin_size_ms=1000):
    """
    Compute Relative Jaggedness Index (RJI)
    Steps:
      1. Convert timestamps to time bins (e.g., 1 second)
      2. Count number of events per bin
      3. Compute RMSSD over successive differences
      4. Normalize RMSSD by mean activity to get RJI
    """
    if df.empty or len(df) < 2:
        return 0.0

    # Normalize timestamps to start at 0
    t_min = df["timestamp"].min()
    df["time_offset"] = df["timestamp"] - t_min

    # Create bins (1 second = 1000 ms)
    df["time_bin"] = (df["time_offset"] // bin_size_ms).astype(int)

    # Count how many events occurred per bin
    time_series = df.groupby("time_bin").size().to_numpy()

    if len(time_series) < 2:
        return 0.0

    # Compute successive differences
    diffs = np.diff(time_series)

    # Root Mean Square of Successive Differences (RMSSD)
    rmssd = np.sqrt(np.mean(diffs ** 2))

    # Mean activity level μ
    mean_activity = np.mean(time_series)

    # Avoid divide-by-zero
    if mean_activity == 0:
        return 0.0

    # Relative Jaggedness Index (RJI)
    rji = rmssd / mean_activity
    return float(rji)


def extract_features(df):
    # Sort by time
    df = df.sort_values(by="timestamp").reset_index(drop=True)

    # Basic temporal and behavioral features
    total_actions = len(df)
    total_typing_time = df["timestamp"].iloc[-1] - df["timestamp"].iloc[0] if total_actions > 1 else 0
    avg_typing_speed = total_typing_time / total_actions if total_actions > 0 else 0

    paste_count = df["isPaste"].sum()
    delete_count = df["isDeletion"].sum()
    compile_count = df["isCompilation"].sum()
    submit_count = df["isSubmission"].sum()

    # Compute RJI
    rji_value = compute_rji(df)

    return {
        "total_actions": total_actions,
        "total_time_ms": total_typing_time,
        "avg_time_per_action_ms": avg_typing_speed,
        "paste_count": paste_count,
        "deletion_count": delete_count,
        "compilation_count": compile_count,
        "submission_count": submit_count,
        "RJI": rji_value,
    }


def process_log_folder(folder_path="logi"):
    all_features = []

    for filename in os.listdir(folder_path):
        if not filename.startswith("PES"):
            continue  # skip non-log files

        filepath = os.path.join(folder_path, filename)
        if os.path.isfile(filepath):
            df = load_log_file(filepath)
            if not df.empty:
                features = extract_features(df)
                features["SRN"] = filename
                all_features.append(features)

    return pd.DataFrame(all_features)


if __name__ == "__main__":
    features_df = process_log_folder("logi")
    print(features_df.head())
    print(f"Processed {len(features_df)} student logs.")
    print(features_df.columns)
    features_df.to_csv("extracted_features_rji.csv", index=False)
    print("Features saved to extracted_features_rji.csv")

    low_rji_df = features_df[features_df["RJI"] < 0.75]
    print("\nStudents with RJI < 0.75:")
    print(low_rji_df[["SRN", "RJI"]])

    print(f"\nTotal students with RJI < 0.75: {len(low_rji_df)}")
