module.exports = function(grunt){

	grunt.loadNpmTasks('grunt-geth')
	grunt.loadTasks('tasks/')

	grunt.config.init({
		'solc-output-deploy':{
			development:{
				options:{
					rpchost:'localhost'
					,rpcport:8101
					,contracts:'contracts.json'
					,key:'key.json'
					,password:'dev_password'
					,deploy:[
						'AliasReg'
						,'Keystore'
						,'OrderBook'
					],chain:'chain.json'
				}
			}
		},geth:{
			development:{
				options:{
					flags:{
						rpc: true
						,rpcport: 8101
						,mine: true
						,maxpeers: 0
						,datadir: '/tmp/grunt-solc-output-deploy'
						,etherbase: '0x'+grunt.file.readJSON('key.json').address
						,genesis: 'genesis.json'
						,networkid: 123
						,nodiscover: true
						,minerthreads: 1
					}
				}
			}
		}
	})
}