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
    """
    Extract behavioral features from student coding logs.
    
    Features are scaled using StandardScaler during training, so different
    scales across features (counts vs ratios) are properly normalized.
    
    Returns dict with features in consistent order for model compatibility.
    """
    # Sort by time
    df = df.sort_values(by="timestamp").reset_index(drop=True)

    # Calculate character differences for each action
    df['char_diff'] = df['editorContentAfter'].str.len() - df['editorContentBefore'].str.len()
    df['inserted_chars'] = df['char_diff'].apply(lambda x: x if x > 0 else 0)
    df['deleted_chars'] = df['char_diff'].apply(lambda x: -x if x < 0 else 0)

    # Totals
    total_actions = len(df)
    total_inserted_chars = df['inserted_chars'].sum()
    total_deleted_chars = df['deleted_chars'].sum()

    # Behavioral features
    paste_count = df["isPaste"].sum()
    compile_count = df["isCompilation"].sum()
    submit_count = df["isSubmission"].sum()

    # Ratios and rates
    deletion_ratio = total_deleted_chars / total_inserted_chars if total_inserted_chars > 0 else 1.0
    insertion_ratio = total_inserted_chars / total_actions if total_actions > 0 else 0.0
    code_churn_rate = (total_inserted_chars + total_deleted_chars) / total_actions if total_actions > 0 else 0.0

    # Compute RJI
    rji_value = compute_rji(df)

    return {
        "paste_count": int(paste_count),
        "deletion_ratio": float(deletion_ratio),
        "insertion_ratio": float(insertion_ratio),
        "compilation_count": int(compile_count),
        "submission_count": int(submit_count),
        "RJI": float(rji_value),
        "code_churn_rate": float(code_churn_rate),
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
    
    # IMPORTANT: Column order must remain consistent for StandardScaler
    # Expected order: paste_count, deletion_ratio, insertion_ratio, 
    #                 compilation_count, submission_count, RJI, code_churn_rate, SRN
    features_df.to_csv("nocs.csv", index=False)
    print("Features saved to nocs.csv")

    low_rji_df = features_df[features_df["RJI"] < 0.75]
    print("\nStudents with RJI < 0.75:")
    print(low_rji_df[["SRN", "RJI"]])

    print(f"\nTotal students with RJI < 0.75: {len(low_rji_df)}")
