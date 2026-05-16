import socket
import time
import sys

def send_udp(ip, port, message):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(message.encode('utf-8'), (ip, port))
    print(f"Sent log: {message[:70]}...")
    time.sleep(0.2)

def simulate_ac_traffic(worker_ip):
    port = 514
    
    logs = [
        # Auth success
        '<190> 2026-05-13 20:30:01 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication succeeded. user="narissara.me@wuhospital.local" ip="10.251.50.144" radiusclientip="10.251.0.1" time="2026-05-13 20:30:01" mac="7A-DD-95-4E-91-D6" apmac="8C-68-3A-F4-30-90" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        '<190> 2026-05-13 20:30:02 AgileController %%01RADIUSLOG/6/LOGONOROFF(l): The user log was created. user="narissara.me@wuhospital.local" userName="narissara.me" ip="10.251.50.144" radiusclientip="10.251.0.1" msgtype="online" time="2026-05-13 20:30:02" mac="7A-DD-95-4E-91-D6" apmac="8C-68-3A-F4-30-90"',
        
        # Another Auth Success
        '<190> 2026-05-13 20:31:10 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication succeeded. user="somchai.su@wuhospital.local" ip="10.251.50.188" radiusclientip="10.251.0.2" time="2026-05-13 20:31:10" mac="1C-2B-3C-4D-5E-6F" apmac="8C-68-3A-F4-30-91" radiusClientSysName="WUH-B-FL2-S6730-STACK-2"',
        '<190> 2026-05-13 20:31:11 AgileController %%01RADIUSLOG/6/LOGONOROFF(l): The user log was created. user="somchai.su@wuhospital.local" userName="somchai.su" ip="10.251.50.188" radiusclientip="10.251.0.2" msgtype="online" time="2026-05-13 20:31:11" mac="1C-2B-3C-4D-5E-6F" apmac="8C-68-3A-F4-30-91"',
        
        # Auth Failures (MAC 153) - Target for brute force
        '<190> 2026-05-13 20:32:05 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed. user="AA-BB-CC-DD-EE-FF" ip="10.251.85.99" radiusclientip="10.251.0.11" time="2026-05-13 20:32:05" mac="AA-BB-CC-DD-EE-FF" apmac="28-DE-E5-B7-7E-70" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        '<190> 2026-05-13 20:32:06 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed. user="AA-BB-CC-DD-EE-FF" ip="10.251.85.99" radiusclientip="10.251.0.11" time="2026-05-13 20:32:06" mac="AA-BB-CC-DD-EE-FF" apmac="28-DE-E5-B7-7E-70" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        '<190> 2026-05-13 20:32:07 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed. user="AA-BB-CC-DD-EE-FF" ip="10.251.85.99" radiusclientip="10.251.0.11" time="2026-05-13 20:32:07" mac="AA-BB-CC-DD-EE-FF" apmac="28-DE-E5-B7-7E-70" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        '<190> 2026-05-13 20:32:08 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed. user="AA-BB-CC-DD-EE-FF" ip="10.251.85.99" radiusclientip="10.251.0.11" time="2026-05-13 20:32:08" mac="AA-BB-CC-DD-EE-FF" apmac="28-DE-E5-B7-7E-70" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        '<190> 2026-05-13 20:32:09 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed. user="AA-BB-CC-DD-EE-FF" ip="10.251.85.99" radiusclientip="10.251.0.11" time="2026-05-13 20:32:09" mac="AA-BB-CC-DD-EE-FF" apmac="28-DE-E5-B7-7E-70" errorcode="153" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        
        # Credential Failure (Error 116)
        '<190> 2026-05-13 20:33:15 AgileController %%01RADIUSLOG/6/AUTHENTICATION(l): The user authentication failed. user="attacker.usr" ip="10.251.85.10" radiusclientip="10.251.0.11" time="2026-05-13 20:33:15" mac="CC-CC-CC-CC-CC-CC" apmac="28-DE-E5-B7-7E-70" errorcode="116" radiusClientSysName="WUH-A-FL1-S6730-STACK-1"',
        
        # Logoff
        '<190> 2026-05-13 20:35:40 AgileController %%01RADIUSLOG/6/LOGONOROFF(l): The user log was deleted. user="somchai.su@wuhospital.local" userName="somchai.su" ip="10.251.50.188" radiusclientip="10.251.0.2" msgtype="offline" time="2026-05-13 20:35:40" mac="1C-2B-3C-4D-5E-6F" apmac="8C-68-3A-F4-30-91"'
    ]
    
    for log in logs:
        send_udp(worker_ip, port, log)
    print("Sent all mock events successfully!")

if __name__ == '__main__':
    target_worker = '10.251.151.12'
    if len(sys.argv) > 1:
        target_worker = sys.argv[1]
    simulate_ac_traffic(target_worker)
