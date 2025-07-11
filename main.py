#!/usr/bin/env python3
"""
Replit Entry Point for Irys Snippet Vault
Automatically installs dependencies and runs both backend and frontend servers
"""

import subprocess
import sys
import os
import time
import signal
import threading
from pathlib import Path

# Global process references for cleanup
backend_process = None
frontend_process = None

def signal_handler(signum, frame):
    """Handle graceful shutdown on SIGINT (Ctrl+C)"""
    print("\n🛑 Shutting down servers...")
    if backend_process:
        backend_process.terminate()
    if frontend_process:
        frontend_process.terminate()
    sys.exit(0)

def install_python_dependencies():
    """Install Python dependencies for backend"""
    print("📦 Installing Python dependencies...")
    
    # Install backend dependencies
    backend_req = Path("backend/requirements.txt")
    if backend_req.exists():
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(backend_req)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Failed to install Python dependencies: {result.stderr}")
            return False
    
    # Install root level dependencies if they exist
    root_req = Path("requirements.txt")
    if root_req.exists():
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(root_req)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Failed to install root Python dependencies: {result.stderr}")
            return False
    
    print("✅ Python dependencies installed successfully")
    return True

def install_node_dependencies():
    """Install Node.js dependencies for frontend"""
    print("📦 Installing Node.js dependencies...")
    
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("📥 Installing frontend dependencies...")
        
        # Try yarn first, then npm
        try:
            result = subprocess.run([
                "yarn", "install"
            ], cwd=frontend_dir, capture_output=True, text=True)
            
            if result.returncode != 0:
                print("⚠️  Yarn failed, trying npm...")
                result = subprocess.run([
                    "npm", "install"
                ], cwd=frontend_dir, capture_output=True, text=True)
                
                if result.returncode != 0:
                    print(f"❌ Failed to install Node dependencies: {result.stderr}")
                    return False
        except FileNotFoundError:
            print("⚠️  Yarn not found, using npm...")
            result = subprocess.run([
                "npm", "install"
            ], cwd=frontend_dir, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"❌ Failed to install Node dependencies: {result.stderr}")
                return False
    
    print("✅ Node.js dependencies installed successfully")
    return True

def check_environment():
    """Check if required environment variables are set"""
    print("🔍 Checking environment variables...")
    
    required_vars = [
        'MONGO_URL',
        'DB_NAME',
        'CLAUDE_API_KEY',
        'IRYS_PRIVATE_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️  Missing environment variables (add them to Replit Secrets):")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n📖 Add these secrets in Replit:")
        print("   1. Open your Repl")
        print("   2. Click the 'Secrets' tab (🔒)")
        print("   3. Add each missing variable")
        print("   4. Restart your Repl")
        return False
    
    print("✅ All required environment variables are set")
    return True

def setup_backend_module():
    """Ensure backend can be imported as a module"""
    backend_init = Path("backend/__init__.py")
    if not backend_init.exists():
        print("📁 Creating backend/__init__.py...")
        backend_init.write_text("# Backend module for Irys Snippet Vault\n")
    
    return True

def start_backend():
    """Start the FastAPI backend server"""
    global backend_process
    
    print("🚀 Starting backend server on port 8000...")
    
    # Add current directory to Python path
    env = os.environ.copy()
    env['PYTHONPATH'] = str(Path.cwd()) + ":" + env.get('PYTHONPATH', '')
    
    # Check if we're in a resource-constrained environment (like Replit)
    use_reload = os.environ.get('REPLIT_CLUSTER') is None
    
    cmd = [
        sys.executable, "-m", "uvicorn",
        "backend.server:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]
    
    if use_reload:
        cmd.append("--reload")
    
    backend_process = subprocess.Popen(cmd, env=env)
    
    return backend_process

def start_frontend():
    """Start the React frontend server"""
    global frontend_process
    
    print("🚀 Starting frontend server on port 3000...")
    
    # Set environment variables for frontend
    env = os.environ.copy()
    env['PORT'] = '3000'
    
    # Check if we should use yarn or npm
    frontend_dir = Path("frontend")
    if (frontend_dir / "yarn.lock").exists():
        cmd = ["yarn", "start"]
    else:
        cmd = ["npm", "start"]
    
    frontend_process = subprocess.Popen(
        cmd,
        cwd=frontend_dir,
        env=env
    )
    
    return frontend_process

def wait_for_servers():
    """Wait for both servers to be ready"""
    print("⏳ Waiting for servers to start...")
    
    # Wait a bit for backend to start
    time.sleep(5)
    
    # Check if backend is responding
    try:
        import requests
        response = requests.get("http://localhost:8000/api/health", timeout=10)
        if response.status_code == 200:
            print("✅ Backend server is ready!")
        else:
            print("⚠️  Backend server might not be ready yet")
    except Exception as e:
        print(f"⚠️  Backend server check failed: {e}")
    
    # Wait a bit more for frontend
    time.sleep(5)
    print("✅ Frontend server should be ready!")

def print_startup_info():
    """Print startup information"""
    print("\n" + "="*60)
    print("🎉 IRYS SNIPPET VAULT - REPLIT DEPLOYMENT")
    print("="*60)
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("="*60)
    print("💡 Your app is now running!")
    print("   - Connect your wallet to get started")
    print("   - Create and store content on blockchain")
    print("   - Explore social features")
    print("="*60)

def main():
    """Main entry point for Replit deployment"""
    print("🚀 Starting Irys Snippet Vault on Replit...")
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Step 1: Setup backend module
    if not setup_backend_module():
        print("❌ Failed to setup backend module")
        return 1
    
    # Step 2: Install dependencies
    if not install_python_dependencies():
        print("❌ Failed to install Python dependencies")
        return 1
    
    if not install_node_dependencies():
        print("❌ Failed to install Node.js dependencies")
        return 1
    
    # Step 3: Check environment
    if not check_environment():
        print("❌ Environment check failed")
        return 1
    
    # Step 4: Start backend server
    try:
        backend_proc = start_backend()
        if not backend_proc:
            print("❌ Failed to start backend server")
            return 1
    except Exception as e:
        print(f"❌ Backend startup error: {e}")
        return 1
    
    # Step 5: Start frontend server
    try:
        frontend_proc = start_frontend()
        if not frontend_proc:
            print("❌ Failed to start frontend server")
            return 1
    except Exception as e:
        print(f"❌ Frontend startup error: {e}")
        return 1
    
    # Step 6: Wait for servers to be ready
    wait_for_servers()
    
    # Step 7: Print startup info
    print_startup_info()
    
    # Step 8: Keep main thread alive and monitor processes
    try:
        while True:
            # Check if processes are still running
            if backend_proc.poll() is not None:
                print("❌ Backend process died, restarting...")
                backend_proc = start_backend()
            
            if frontend_proc.poll() is not None:
                print("❌ Frontend process died, restarting...")
                frontend_proc = start_frontend()
            
            time.sleep(10)  # Check every 10 seconds
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        return 0

if __name__ == "__main__":
    sys.exit(main())