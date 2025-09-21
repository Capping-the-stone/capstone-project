import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os
from datetime import datetime


features_df = pd.read_csv("extracted_features.csv")

srns = features_df["SRN"]
X = features_df.drop(columns=["SRN"])

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = IsolationForest(contamination=0.05, random_state=42)
features_df["anomaly_score"] = model.fit_predict(X_scaled)

features_df["is_suspected_cheating"] = features_df["anomaly_score"] == -1

features_df["SRN"] = srns

print("\nSuspected Cheating:")
print(features_df[features_df["is_suspected_cheating"]][["SRN"]])

features_df.to_csv("cheating_predictions.csv", index=False)
print("\nCheating results saved to cheating_predictions.csv")

# Save the trained model and scaler
os.makedirs("models", exist_ok=True)
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_name = f"cheating_detector_{timestamp}"

# Save model and scaler
joblib.dump(model, f"models/{model_name}.joblib")
joblib.dump(scaler, f"models/{model_name}_scaler.joblib")

print(f"\nModel saved as: models/{model_name}.joblib")
print(f"Scaler saved as: models/{model_name}_scaler.joblib")

print("-----------")

# plt.hist(features_df["anomaly_score"], bins=30)
# plt.title("Anomaly Score Distribution")
# plt.xlabel("Score")
# plt.ylabel("Frequency")
# plt.show()


