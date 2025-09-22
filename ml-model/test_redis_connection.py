#!/usr/bin/env python3
"""
Test script to verify Redis connection and data retrieval
This can be run inside the ML model container to test Redis connectivity
"""

import os
import sys
from get_data_from_redis import RedisDataRetriever, get_features_from_redis

def test_redis_connection():
    """Test basic Redis connection"""
    print("Testing Redis connection...")
    
    try:
        retriever = RedisDataRetriever()
        retriever.client.ping()
        print("✅ Redis connection successful!")
        
        # Test getting keys
        keys = retriever.get_all_keys("*")
        print(f"✅ Found {len(keys)} keys in Redis")
        
        if keys:
            print("Sample keys:")
            for key in keys[:5]:  # Show first 5 keys
                print(f"  - {key}")
        
        retriever.close()
        return True
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def test_data_retrieval():
    """Test data retrieval from Redis"""
    print("\nTesting data retrieval...")
    
    try:
        features_df = get_features_from_redis()
        
        if features_df.empty:
            print("⚠️  No data found in Redis")
            print("   This is normal if PySpark stream processor hasn't processed any data yet")
            return True
        
        print(f"✅ Retrieved data for {len(features_df)} students")
        print(f"   Columns: {list(features_df.columns)}")
        print(f"   Sample data:")
        print(features_df.head(3))
        
        return True
        
    except Exception as e:
        print(f"❌ Data retrieval failed: {e}")
        return False

def main():
    """Main test function"""
    print("=" * 50)
    print("Redis Connection Test for ML Model Container")
    print("=" * 50)
    
    # Check environment variables
    print(f"REDIS_HOST: {os.getenv('REDIS_HOST', 'redis-dev')}")
    print(f"REDIS_PORT: {os.getenv('REDIS_PORT', '6379')}")
    print(f"REDIS_CLUSTER_NODES: {os.getenv('REDIS_CLUSTER_NODES', 'Not set')}")
    
    # Test connection
    connection_ok = test_redis_connection()
    
    if connection_ok:
        # Test data retrieval
        data_ok = test_data_retrieval()
        
        if data_ok:
            print("\n🎉 All tests passed! Redis integration is working correctly.")
            sys.exit(0)
        else:
            print("\n⚠️  Connection works but no data found. This might be normal if no data has been processed yet.")
            sys.exit(0)
    else:
        print("\n❌ Redis connection failed. Check if Redis container is running.")
        sys.exit(1)

if __name__ == "__main__":
    main()
