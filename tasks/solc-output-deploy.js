module.exports = function(grunt){

	grunt.registerMultiTask('solc-output-deploy',function(){

		var Web3 = require('web3')
			,Q = require('q')
		
		var done = this.async()
			,options = this.options({
				rpchost: 'localhost'
				,rpcport: 8545
				,forceRedeploy:false
				,onDeploy: {}
			})
			,web3 = new Web3()
			,contractsObj = grunt.file.readJSON(options.contracts).contracts
			,chain = grunt.file.exists(options.chain) ? grunt.file.readJSON(options.chain) : {}
			,rpcUrl = 'http://'+options.rpchost+':'+options.rpcport
			,requiredOptionKeys = ['contracts','chain','deploy']

		requiredOptionKeys.forEach(function(key){
			if(options[key]) return;

			grunt.log.error('options.'+key,'missing');
			done(false)
		})

		web3.setProvider(new web3.providers.HttpProvider(rpcUrl));

		var address = options.address || web3.eth.accounts[0]

		if(!address){
			grunt.log.error('Could not determine address')
			done(false)
		}

		grunt.log.writeln('Setting',address,'as default account')
		web3.eth.defaultAccount = address

		var contractsToDeploy = options.deploy.filter(function(contractName){
			if(chain[contractName] && hexify(contractsObj[contractName].runtimeBytecode) == web3.eth.getCode(chain[contractName].address)){
				grunt.log.writeln(contractName,'already deployed to',chain[contractName].address)
				return false
			}else{
				return true
			}
		})

		if(contractsToDeploy.length===0){
			grunt.log.success('No contracts to deploy')
			return done(true)
		}else{
			grunt.log.writeln(contractsToDeploy.length,'contracts need deployment')
		}

		if(!web3.isConnected()){
			grunt.log.error('Web3 cannot connect on',options.rpchost,options.rpcport)
			return done(false)
		}		

		var deployPromises = contractsToDeploy.map(function(contractName){
			return new Deployment(contractName)
		})

		Q.all(deployPromises).then(function(){
			grunt.file.write(options.chain,JSON.stringify(chain))
			grunt.log.success('Deployed all contracts and wrote chain to',options.chain)
			done(true)
		})

		function Deployment(contractName){
			
			var deferred = Q.defer()
				,txParams = {
					data: hexify(contractsObj[contractName].bytecode)
					,gasPrice: web3.toHex(web3.eth.gasPrice)
				}

			txParams.gasLimit = web3.toHex(web3.eth.estimateGas(txParams))
	
			web3.eth.sendTransaction(txParams,function(err,txHex){
				if(err){
					grunt.log.error('Deploying',contractName,'failed:',err.message)
					return done(false)
				}

				grunt.log.writeln('Deploying',contractName,'with transaction',txHex)

				waitForTx(txHex).then(function(transactionReceipt){

					grunt.log.writeln('Deployed',contractName,'to',transactionReceipt.contractAddress)

					if(options.onDeploy[contractName]){
						var abi = JSON.parse(contractsObj[contractName].interface)
							,thisContract = web3.eth.contract(abi).at(transactionReceipt.contractAddress)

						options.onDeploy[contractName].forEach(function(snippet){
							grunt.log.writeln('eval:',snippet)
							try{
								eval(snippet);
							}catch(e){
								grunt.log.error(e)
								grunt.file.write(options.chain,JSON.stringify(chain))
								done(false)
							}
							
						})
					}

					chain[contractName] = {
						address:hexify(transactionReceipt.contractAddress)
						,runtimeBytecode:hexify(web3.eth.getCode(transactionReceipt.contractAddress))
					}

					deferred.resolve()

				})
			})

			return deferred.promise
		}

		function hexify(string){
			if(string.indexOf('0x')===0)
				return string
			else
				return '0x'+string
		}

		function waitForTx(txHex){
			var deferred = Q.defer()
				,waitInterval = setInterval(function(){

					var txReceipt = web3.eth.getTransactionReceipt(txHex)
					
					if(!txReceipt) return;

					clearInterval(waitInterval)
					deferred.resolve(txReceipt)

				},1000)

			return deferred.promise
		}


	})
}