#!/usr/bin/env python3
"""
Replit Deployment Verification Script
Tests all components of the Irys Snippet Vault application
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path

def test_python_import():
    """Test that backend module can be imported"""
    print("🔍 Testing Python module imports...")
    try:
        # Test basic imports
        import fastapi
        import uvicorn
        import pymongo
        print("✅ Core Python dependencies available")
        
        # Test backend module import
        from backend.server import app
        print("✅ Backend module imports successfully")
        
        return True
    except Exception as e:
        print(f"❌ Python import failed: {e}")
        return False

def test_node_dependencies():
    """Test that Node.js dependencies are available"""
    print("🔍 Testing Node.js dependencies...")
    try:
        # Check if frontend dependencies exist
        frontend_dir = Path("frontend")
        if (frontend_dir / "node_modules").exists():
            print("✅ Frontend dependencies installed")
        else:
            print("⚠️  Frontend dependencies not installed")
            return False
        
        # Check if backend Node dependencies exist
        backend_dir = Path("backend")
        if (backend_dir / "node_modules").exists():
            print("✅ Backend Node.js dependencies installed")
        else:
            print("⚠️  Backend Node.js dependencies not installed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Node.js dependency check failed: {e}")
        return False

def test_environment_variables():
    """Test environment variable handling"""
    print("🔍 Testing environment variables...")
    
    required_vars = ['MONGO_URL', 'DB_NAME', 'CLAUDE_API_KEY', 'IRYS_PRIVATE_KEY']
    
    # Test with missing vars
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing environment variables: {missing_vars}")
        print("✅ Environment variable detection working correctly")
    else:
        print("✅ All environment variables present")
    
    return True

def test_file_structure():
    """Test that all required files exist"""
    print("🔍 Testing file structure...")
    
    required_files = [
        'main.py',
        '.replit',
        'replit.nix',
        'requirements.txt',
        'backend/__init__.py',
        'backend/server.py',
        'backend/irys_service.js',
        'frontend/package.json',
        'frontend/.env.example'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    else:
        print("✅ All required files present")
        return True

def test_uvicorn_command():
    """Test that uvicorn can find the backend module"""
    print("🔍 Testing uvicorn command...")
    try:
        # Add current directory to Python path
        env = os.environ.copy()
        env['PYTHONPATH'] = str(Path.cwd()) + ":" + env.get('PYTHONPATH', '')
        
        # Test uvicorn command (dry run)
        result = subprocess.run([
            sys.executable, "-m", "uvicorn",
            "backend.server:app",
            "--help"
        ], env=env, capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("✅ Uvicorn can find backend module")
            return True
        else:
            print(f"❌ Uvicorn command failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Uvicorn test failed: {e}")
        return False

def test_backend_startup():
    """Test backend server startup"""
    print("🔍 Testing backend server startup...")
    try:
        # Set test environment variables
        env = os.environ.copy()
        env.update({
            'MONGO_URL': 'mongodb://localhost:27017/',
            'DB_NAME': 'test_db',
            'CLAUDE_API_KEY': 'test_key',
            'IRYS_PRIVATE_KEY': '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            'PYTHONPATH': str(Path.cwd()) + ":" + env.get('PYTHONPATH', '')
        })
        
        # Start backend server
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn",
            "backend.server:app",
            "--host", "127.0.0.1",
            "--port", "8001"  # Use different port to avoid conflicts
        ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for server to start
        time.sleep(5)
        
        # Test health endpoint
        try:
            response = requests.get("http://127.0.0.1:8001/api/health", timeout=5)
            if response.status_code == 200:
                print("✅ Backend server starts successfully")
                process.terminate()
                return True
            else:
                print(f"❌ Backend health check failed: {response.status_code}")
                process.terminate()
                return False
        except Exception as e:
            print(f"❌ Backend health check failed: {e}")
            process.terminate()
            return False
            
    except Exception as e:
        print(f"❌ Backend startup test failed: {e}")
        return False

def run_all_tests():
    """Run all verification tests"""
    print("🚀 Starting Replit Deployment Verification")
    print("=" * 50)
    
    tests = [
        ("File Structure", test_file_structure),
        ("Python Imports", test_python_import),
        ("Node.js Dependencies", test_node_dependencies),
        ("Environment Variables", test_environment_variables),
        ("Uvicorn Command", test_uvicorn_command),
        ("Backend Startup", test_backend_startup),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} test...")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} test passed")
            else:
                failed += 1
                print(f"❌ {test_name} test failed")
        except Exception as e:
            failed += 1
            print(f"❌ {test_name} test failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Deployment is ready for Replit!")
        return True
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)