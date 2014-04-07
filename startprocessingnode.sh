#check to see if wisdmconfig.js has been created
if [ ! -f src/wisdmconfig.js ]; then
    echo "src/wisdmconfig.js not found! You must create this file by copying src/wisdmconfig_template.js to src/wisdmconfig.js, then edit the file to achieve the desired setup.";
		exit(0);
fi

