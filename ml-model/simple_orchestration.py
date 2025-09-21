#!/usr/bin/env python3
"""
Simple ML Orchestration
Receives API call -> Gets data from Redis -> Uses saved ML model -> Prints cheating students
"""

import os
import json
import pandas as pd
from cheating_detector_with_persistence import CheatingDetector

class MLOrchestration:
    def __init__(self, use_redis=True):
        """Initialize the orchestration with saved model"""
        self.detector = CheatingDetector()
        self.use_redis = use_redis
        self._load_latest_model()
    
    def _load_latest_model(self):
        """Load the latest saved model"""
        models = self.detector.list_saved_models()
        if not models:
            raise ValueError("No saved models found. Train a model first.")
        
        latest_model = models[-1]
        self.detector.load_model(latest_model)
        print(f"Loaded model: {latest_model}")
    
    def get_data(self):
        """Get data from Redis"""
        if self.use_redis:
            try:
                from get_data_from_redis import get_features_from_redis
                features_df = get_features_from_redis()
                if not features_df.empty:
                    print("Data retrieved from Redis")
                    return features_df
            except Exception as e:
                print(f"Redis connection failed: {e}")
    
    def predict_cheating(self):
        """Main function: Get data and predict cheating"""
        print("Getting data...")
        
        # Get data
        features_df = self.get_data()
        
        if features_df.empty:
            print("No data found")
            return []
        
        print(f"Analyzing {len(features_df)} students...")
        
        # Use saved model to predict
        result_df = self.detector.predict(features_df)
        
        # Get suspected cheaters
        suspected_cheaters = result_df[result_df["is_suspected_cheating"]]
        
        # Print results
        print("\n" + "="*50)
        print("CHEATING DETECTION RESULTS")
        print(f"Total students: {len(result_df)}")
        print(f"Suspected cheaters: {len(suspected_cheaters)}")
        print(f"Detection rate: {len(suspected_cheaters)/len(result_df)*100:.2f}%")
        
        if not suspected_cheaters.empty:
            print("\nSuspected Students:")
            for _, row in suspected_cheaters.iterrows():
                print(f"  - {row['SRN']}")
        else:
            print("\nNo suspected cheaters found.")
        
        print("="*50)
        
        return suspected_cheaters["SRN"].tolist()

def main():
    """Main function to run the orchestration"""
    try:
        # Try Redis first
        orchestration = MLOrchestration(use_redis=True)
        cheating_students = orchestration.predict_cheating()
        return cheating_students
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    main()
