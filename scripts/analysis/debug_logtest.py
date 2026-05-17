import subprocess
import sys

def run_logtest(log_message):
    script = f"""
import subprocess

p = subprocess.Popen(["/var/ossec/bin/wazuh-logtest"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
stdout, stderr = p.communicate(input='''{log_message}''')
print("STDOUT:")
print(stdout)
print("STDERR:")
print(stderr)
"""
    # Write script to Master /tmp/
    import tempfile
    with open("/tmp/test_script.py", "w") as f:
        f.write(script)
        
    # Send it to Master and run
    subprocess.run(["sshpass", "-p", "wazuh", "scp", "-o", "StrictHostKeyChecking=no", "/tmp/test_script.py", "wazuh-user@10.251.151.11:/tmp/test_script.py"])
    res = subprocess.run(["sshpass", "-p", "wazuh", "ssh", "-o", "StrictHostKeyChecking=no", "wazuh-user@10.251.151.11", "sudo python3 /tmp/test_script.py"], capture_output=True, text=True)
    print("--- REMOTE LOGTEST OUTPUT ---")
    print(res.stdout)
    print(res.stderr)

if __name__ == "__main__":
    log = 'May 15 2026 07:56:05 WUH-B-DC-USG6712E-1 %%01POLICY/6/POLICYDENY(l):vsys=public, protocol=17, source-ip=110.164.57.3, source-port=49198, destination-ip=202.28.71.194, destination-port=62196, time=May 15 2026 14:56:05, source-zone=untrust, destination-zone=local, application-name=, rule-name=Deny-To-Firewall.'
    run_logtest(log)
