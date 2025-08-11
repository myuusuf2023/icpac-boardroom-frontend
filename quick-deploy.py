#!/usr/bin/env python3
import paramiko
import os
import sys
import time

def deploy_to_vps():
    print("🚀 ICPAC Booking System - Python Deployment")
    print("=" * 45)
    
    # VPS connection details
    hostname = '77.237.247.119'
    username = 'root'
    password = 'ikraan2019#'
    
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print("📡 Connecting to VPS...")
        ssh.connect(hostname, username=username, password=password)
        print("✅ Connected successfully!")
        
        # Create SFTP client for file upload
        sftp = ssh.open_sftp()
        
        # Upload files
        print("📤 Uploading deployment package...")
        local_tar = '/home/yusuf/icpac/icpac-boardroom-frontend/icpac-booking.tar.gz'
        remote_tar = '/tmp/icpac-booking.tar.gz'
        sftp.put(local_tar, remote_tar)
        print("✅ Package uploaded!")
        
        print("📤 Uploading deployment script...")
        local_script = '/home/yusuf/icpac/icpac-boardroom-frontend/complete-deployment.sh'
        remote_script = '/tmp/complete-deployment.sh'
        sftp.put(local_script, remote_script)
        print("✅ Script uploaded!")
        
        sftp.close()
        
        # Execute deployment
        print("🚀 Starting deployment on VPS...")
        stdin, stdout, stderr = ssh.exec_command('cd /tmp && chmod +x complete-deployment.sh && ./complete-deployment.sh')
        
        # Stream output in real-time
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line.strip())
        
        # Check for errors
        error_output = stderr.read().decode()
        if error_output:
            print("⚠️ Errors:", error_output)
        
        ssh.close()
        
        print("\n🎉 DEPLOYMENT COMPLETED!")
        print("=" * 30)
        print("🌐 Your application is now live at:")
        print("👉 http://77.237.247.119")
        print("\n🔑 Admin access:")
        print("👉 http://77.237.247.119/admin/")
        print("Username: superadmin")
        print("Password: admin123")
        
        # Test the deployment
        print("\n🧪 Testing deployment...")
        import requests
        try:
            response = requests.get('http://77.237.247.119', timeout=10)
            if response.status_code == 200:
                print("✅ Website is live and responding!")
            else:
                print(f"⚠️ Website returned status code: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Could not test website: {e}")
            print("Please try accessing http://77.237.247.119 manually in 1-2 minutes")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        print("\nTry manual deployment:")
        print("1. scp /home/yusuf/icpac/icpac-boardroom-frontend/icpac-booking.tar.gz root@77.237.247.119:/tmp/")
        print("2. scp /home/yusuf/icpac/icpac-boardroom-frontend/complete-deployment.sh root@77.237.247.119:/tmp/")
        print("3. ssh root@77.237.247.119")
        print("4. cd /tmp && chmod +x complete-deployment.sh && ./complete-deployment.sh")

if __name__ == "__main__":
    deploy_to_vps()