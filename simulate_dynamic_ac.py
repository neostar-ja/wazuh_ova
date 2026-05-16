import socket
import time
from datetime import datetime

def send_udp(ip, port, message):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(message.encode('utf-8'), (ip, port))
    print(f"Sent log: {message}")
    time.sleep(0.1)

def run_simulation(worker_ip):
    port = 514
    now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    
    # Using EXACT full schema from real logs so regex fields match perfectly
    logs = [
        # Auth Success
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication succeeded.  user="narissara.me@wuhospital.local" ip="10.251.50.144" ipv6="" radiusclientip="10.251.0.1" time="{now_str}" mac="7A-DD-95-4E-91-D6" apmac="8C-68-3A-F4-30-90" authenrule="Default Authentication Rule" authorrule="" errorcode="" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        
        # User Session Online
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/LOGONOROFF(l): The user log was created.  user="narissara.me@wuhospital.local" userName="narissara.me" ip="10.251.50.144" ipv6="" radiusclientip="10.251.0.1" msgtype="online" time="{now_str}" mac="7A-DD-95-4E-91-D6" apmac="8C-68-3A-F4-30-90"',
        
        # Auth Success Somchai
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication succeeded.  user="somchai.su@wuhospital.local" ip="10.251.50.188" ipv6="" radiusclientip="10.251.0.2" time="{now_str}" mac="1C-2B-3C-4D-5E-6F" apmac="8C-68-3A-F4-30-91" authenrule="Default Authentication Rule" authorrule="" errorcode="" radiusClientSysName="WUH-B-FL2-S6730-STACK-2"',
        
        # User Session Online Somchai
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/LOGONOROFF(l): The user log was created.  user="somchai.su@wuhospital.local" userName="somchai.su" ip="10.251.50.188" ipv6="" radiusclientip="10.251.0.2" msgtype="online" time="{now_str}" mac="1C-2B-3C-4D-5E-6F" apmac="8C-68-3A-F4-30-91"',
        
        # Auth Failure MAC 153 (Brute force target)
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed.  user="33-44-55-66-77-88" ip="10.251.85.99" ipv6="" radiusclientip="10.251.0.11" time="{now_str}" mac="33-44-55-66-77-88" apmac="28-DE-E5-B7-7E-70" authenrule="Default Authentication Rule" authorrule="" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed.  user="33-44-55-66-77-88" ip="10.251.85.99" ipv6="" radiusclientip="10.251.0.11" time="{now_str}" mac="33-44-55-66-77-88" apmac="28-DE-E5-B7-7E-70" authenrule="Default Authentication Rule" authorrule="" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed.  user="33-44-55-66-77-88" ip="10.251.85.99" ipv6="" radiusclientip="10.251.0.11" time="{now_str}" mac="33-44-55-66-77-88" apmac="28-DE-E5-B7-7E-70" authenrule="Default Authentication Rule" authorrule="" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed.  user="33-44-55-66-77-88" ip="10.251.85.99" ipv6="" radiusclientip="10.251.0.11" time="{now_str}" mac="33-44-55-66-77-88" apmac="28-DE-E5-B7-7E-70" authenrule="Default Authentication Rule" authorrule="" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed.  user="33-44-55-66-77-88" ip="10.251.85.99" ipv6="" radiusclientip="10.251.0.11" time="{now_str}" mac="33-44-55-66-77-88" apmac="28-DE-E5-B7-7E-70" authenrule="Default Authentication Rule" authorrule="" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed.  user="33-44-55-66-77-88" ip="10.251.85.99" ipv6="" radiusclientip="10.251.0.11" time="{now_str}" mac="33-44-55-66-77-88" apmac="28-DE-E5-B7-7E-70" authenrule="Default Authentication Rule" authorrule="" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        
        # User Session Offline (Logoff)
        f'<190> {now_str} AgileController %%01RADIUSLOG/6/LOGONOROFF(l): The user log was deleted.  user="somchai.su@wuhospital.local" userName="somchai.su" ip="10.251.50.188" ipv6="" radiusclientip="10.251.0.2" msgtype="offline" time="{now_str}" mac="1C-2B-3C-4D-5E-6F" apmac="8C-68-3A-F4-30-91"'
    ]
    
    for log in logs:
        send_udp(worker_ip, port, log)
    print(f"Successfully sent {len(logs)} fully compliant logs.")

if __name__ == "__main__":
    run_simulation("10.251.151.12")
