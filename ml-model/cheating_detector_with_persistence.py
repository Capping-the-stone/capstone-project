import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CheatingDetector:
    def __init__(self, contamination=0.05, random_state=42, model_dir="models"):
        """
        Initialize the cheating detector with model persistence
        
        Args:
            contamination: Expected proportion of outliers (default 0.05 = 5%)
            random_state: Random seed for reproducibility
            model_dir: Directory to save/load models
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model_dir = model_dir
        self.scaler = StandardScaler()
        self.model = IsolationForest(contamination=contamination, random_state=random_state)
        self.is_fitted = False
        
        # Create model directory if it doesn't exist
        os.makedirs(model_dir, exist_ok=True)
    
    def train_and_save(self, features_df, save_model=True):
        """
        Train the model and optionally save it
        
        Args:
            features_df: DataFrame with features and SRN column
            save_model: Whether to save the trained model
        """
        logger.info("Training cheating detection model...")
        
        # Extract SRNs and features
        srns = features_df["SRN"]
        X = features_df.drop(columns=["SRN"])
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model.fit(X_scaled)
        self.is_fitted = True
        
        logger.info("Model training completed")
        
        # Make predictions on training data
        anomaly_scores = self.model.predict(X_scaled)
        is_suspected_cheating = anomaly_scores == -1
        
        # Add predictions to dataframe
        result_df = features_df.copy()
        result_df["anomaly_score"] = anomaly_scores
        result_df["is_suspected_cheating"] = is_suspected_cheating
        
        # Display results
        suspected_count = is_suspected_cheating.sum()
        logger.info(f"Identified {suspected_count} suspected cheaters out of {len(features_df)} students")
        
        print("\nSuspected Cheating:")
        print(result_df[result_df["is_suspected_cheating"]][["SRN"]])
        
        # Save results
        result_df.to_csv("cheating_predictions.csv", index=False)
        print("\nCheating results saved to cheating_predictions.csv")
        
        # Save model if requested
        if save_model:
            self.save_model()
        
        return result_df
    
    def save_model(self, model_name=None):
        """
        Save the trained model and scaler
        
        Args:
            model_name: Custom name for the model (optional)
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before saving")
        
        if model_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            model_name = f"cheating_detector_{timestamp}"
        
        model_path = os.path.join(self.model_dir, f"{model_name}.joblib")
        scaler_path = os.path.join(self.model_dir, f"{model_name}_scaler.joblib")
        
        # Save model and scaler
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        
        # Save model metadata
        metadata = {
            "model_name": model_name,
            "contamination": self.contamination,
            "random_state": self.random_state,
            "trained_at": datetime.now().isoformat(),
            "model_path": model_path,
            "scaler_path": scaler_path
        }
        
        metadata_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        import json
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {model_path}")
        logger.info(f"Scaler saved to {scaler_path}")
        logger.info(f"Metadata saved to {metadata_path}")
        
        return model_name
    
    def load_model(self, model_name):
        """
        Load a pre-trained model and scaler
        
        Args:
            model_name: Name of the model to load (without .joblib extension)
        """
        model_path = os.path.join(self.model_dir, f"{model_name}.joblib")
        scaler_path = os.path.join(self.model_dir, f"{model_name}_scaler.joblib")
        metadata_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        
        # Check if files exist
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
        
        # Load model and scaler
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        self.is_fitted = True
        
        # Load metadata if available
        if os.path.exists(metadata_path):
            import json
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            logger.info(f"Loaded model: {metadata.get('model_name', model_name)}")
            logger.info(f"Trained at: {metadata.get('trained_at', 'Unknown')}")
        else:
            logger.info(f"Loaded model: {model_name}")
        
        logger.info("Model loaded successfully")
    
    def predict(self, features_df):
        """
        Make predictions on new data using the loaded model
        
        Args:
            features_df: DataFrame with features and SRN column
            
        Returns:
            DataFrame with predictions
        """
        if not self.is_fitted:
            raise ValueError("Model must be loaded before making predictions")
        
        logger.info("Making predictions on new data...")
        
        # Extract SRNs and features
        srns = features_df["SRN"]
        X = features_df.drop(columns=["SRN"])
        
        # Scale features using the loaded scaler
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        anomaly_scores = self.model.predict(X_scaled)
        is_suspected_cheating = anomaly_scores == -1
        
        # Add predictions to dataframe
        result_df = features_df.copy()
        result_df["anomaly_score"] = anomaly_scores
        result_df["is_suspected_cheating"] = is_suspected_cheating
        
        # Log results
        suspected_count = is_suspected_cheating.sum()
        logger.info(f"Identified {suspected_count} suspected cheaters out of {len(features_df)} students")
        
        return result_df
    
    def list_saved_models(self):
        """List all saved models in the model directory"""
        models = []
        for file in os.listdir(self.model_dir):
            if file.endswith('.joblib') and not file.endswith('_scaler.joblib'):
                model_name = file.replace('.joblib', '')
                models.append(model_name)
        return sorted(models)
    
    def generate_visualization(self, result_df, save_path="cheating_analysis.png"):
        """Generate visualization of the results"""
        logger.info("Generating visualization...")
        
        important_features = [
            "insertion_ratio",
            "deletion_ratio",
            "RJI",
            "code_churn_rate",
            "paste_count",
            # "compilation_count",
            # "submission_count"
        ]
        
        # Create pairwise scatter plots
        plt.figure(figsize=(15, 12))
        sns.pairplot(
            result_df[important_features + ["is_suspected_cheating"]], 
            hue="is_suspected_cheating", 
            palette={True: 'red', False: 'blue'}, 
            plot_kws={'s': 50, 'edgecolor': 'black'}
        )
        plt.savefig(save_path)
        logger.info(f"Visualization saved to {save_path}")
        plt.show()


def main():
    """Main function to train and save the model"""
    logger.info("Starting cheating detection model training...")
    
    # Load features data
    features_df = pd.read_csv("nocs.csv")
    logger.info(f"Loaded {len(features_df)} student records")
    
    # Initialize detector
    detector = CheatingDetector(contamination=0.02, random_state=42)
    
    # Train and save model
    result_df = detector.train_and_save(features_df, save_model=True)
    
    # Generate visualization
    detector.generate_visualization(result_df)
    
    # List saved models
    models = detector.list_saved_models()
    print(f"\nSaved models: {models}")
    
    logger.info("Model training and saving completed!")

def load_and_predict_example():
    """Example of how to load a saved model and make predictions"""
    logger.info("Example: Loading saved model and making predictions...")
    
    # Initialize detector
    detector = CheatingDetector()
    
    # List available models
    models = detector.list_saved_models()
    if not models:
        print("No saved models found. Train a model first.")
        return
    
    # Load the most recent model
    latest_model = models[-1]
    detector.load_model(latest_model)
    
    # Load new data for prediction
    features_df = pd.read_csv("nocs.csv")
    
    # Make predictions
    result_df = detector.predict(features_df)
    
    # Display results
    print("\nPrediction Results:")
    print(result_df[result_df["is_suspected_cheating"]][["SRN", "anomaly_score"]])
    
    return result_df

if __name__ == "__main__":
    main()
