//rename this file to wisdmconfig.js and modify

var wisdmconfig={};

wisdmconfig.processingnodeclient={
	node_id:'peregrineXX',
	node_path:'/home/magland/wisdm/peregrineXX',
	owner:'magland',
	secret_id:'', //must be set, known only to the owner (and keep it a secret!)
	server_host:'wisdmhub.org',
	server_port:8082
};

exports.wisdmconfig=wisdmconfig;
