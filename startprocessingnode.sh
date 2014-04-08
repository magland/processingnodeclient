#!/bin/bash

echo "";
echo "";

echo "Checking to see if wisdmconfig.js has been created..."
if [ ! -f src/wisdmconfig.js ]; then
	echo "ERROR: src/wisdmconfig.js not found!";
	echo "You must create this file by copying src/wisdmconfig_template.js to src/wisdmconfig.js."
	echo "Then, edit the new file to achieve the desired setup.";
	echo "";
	exit 0;
fi
echo "Found src/wisdmconfig.js. (You can edit this file to change the node settings)";

echo "Checking to see if node.js is installed..."
node --version >/dev/null 2>&1 || { 
	echo "node.js is not installed. Please see the INSTALL folder to install the required packages.";
	exit 0;
}
OUTPUT=$(node --version)
echo "node installed: $OUTPUT"

echo "Checking to see if mongodb is installed..."
mongo --version >/dev/null 2>&1 || { 
	echo "mongodb is not installed. Please see the INSTALL folder to install the required packages.";
	exit 0;
}
OUTPUT=$(mongo --version)
echo "mongodb installed: $OUTPUT"

echo "Checking to see if octave is installed..."
octave --version >/dev/null 2>&1 || { 
	echo "octave is not installed. Please see the INSTALL folder to install the required packages.";
	exit 0;
}
OUTPUT=$(octave --version | sed -n 1p)
echo "octave installed: $OUTPUT"

echo "Setting paths..."
export PATH=$PATH:$HOME/nodejs/bin
export NODE_PATH=$HOME/nodejs/lib/node_modules

echo "Checking to see if forever is installed..."
forever --version >/dev/null 2>&1 || { 
	echo "forever (node.js package) is not installed. Please see the INSTALL folder to install the required packages.";
	exit 0;
}
OUTPUT=$(forever --version)
echo "forever installed: $OUTPUT"

echo ""
echo ""
echo "TESTING PROCESSING NODE CLIENT"
forever stopall
node src/processingnodeclient.js --testconnection

if [ $? -ne 12 ]; then
	echo "Problem starting processing node client (see above for error messages). Exiting."
	exit 0;
fi

echo ""
echo ""
echo "STARTING PROCESSING NODE CLIENT"
forever stopall
forever start -a -o out.log -e err.log src/run_processingnodeclient.js

