#!/usr/bin/env python3
"""
Test script for the ML Cheating Detection API
"""

import requests
import json

def test_api():
    """Test the API endpoints"""
    base_url = "http://localhost:8001"
    
    print("Testing ML Cheating Detection API")
    print("=" * 40)
    
    # Test health check
    print("1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health status: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    print()
    
    # Test check-this-guy endpoint
    print("2. Testing check-this-guy endpoint...")
    test_data = {
        "srn": "PES2UG24CS001",
        "questionID": 1
    }
    
    try:
        response = requests.post(f"{base_url}/check-this-guy", json=test_data)
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"API call failed: {e}")
    print()
    
    # Test with different student
    print("3. Testing with different student...")
    test_data2 = {
        "srn": "PES2UG24CS002", 
        "questionID": 2
    }
    
    try:
        response = requests.post(f"{base_url}/check-this-guy", json=test_data2)
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"API call failed: {e}")

if __name__ == "__main__":
    test_api()
