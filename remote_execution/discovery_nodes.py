#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime

BASE = "/opt/code/wazuh_ova"

def list_nodes():
    for root, dirs, files in os.walk(BASE):
        for d in dirs:
            print(os.path.join(root, d))
        for f in files:
            print(os.path.join(root, f))

if __name__ == '__main__':
    list_nodes()
