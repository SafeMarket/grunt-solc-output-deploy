module.exports = function exportGrunt(grunt) {

  grunt.registerMultiTask('solc-output-deploy', function regiterSolcOutputDeploy() {

    const Web3 = require('web3')
    const Q = require('q')
    const done = this.async()
    const options = this.options({
      rpchost: 'localhost',
      rpcport: 8545,
      forceRedeploy: false,
      onDeploy: {},
      contractParams:{}
    })
    const web3 = new Web3()
    const contractsObj = grunt.file.readJSON(options.contracts).contracts
    const contracts = {}
    const chain = grunt.file.exists(options.chain) ? grunt.file.readJSON(options.chain) : {}
    const rpcUrl = `http://${options.rpchost}:${options.rpcport}`
    const requiredOptionKeys = ['contracts', 'chain', 'deploy']

    Object.keys(contractsObj).forEach((contractName) => {
      options.contractParams[contractName] = options.contractParams[contractName] || []
      contractsObj[contractName].abi = JSON.parse(contractsObj[contractName].interface)
    })

    requiredOptionKeys.forEach((key) => {
      if (options[key]) {
        return
      }
      grunt.log.error(`options.${key}missing`)
      done(false)
    })

    web3.setProvider(new web3.providers.HttpProvider(rpcUrl))

    const address = options.address || web3.eth.accounts[0]

    if (!address) {
      grunt.log.error('Could not determine address')
      done(false)
    }

    grunt.log.writeln(`Setting ${address} as default account`)
    web3.eth.defaultAccount = address

    const contractsToDeploy = options.deploy.filter((contractName) => {
      if (chain[contractName] && hexify(contractsObj[contractName].runtimeBytecode) === web3.eth.getCode(chain[contractName].address)) {
        grunt.log.writeln(`${contractName} already deployed to ${chain[contractName].address}`)
        contracts[contractName] = web3.eth.contract(contractsObj[contractName].abi).at(contractsObj[contractName].address)
        return false
      }

      return true
    })

    if (contractsToDeploy.length === 0) {
      grunt.log.success('No contracts to deploy')
      return done(true)
    }

    grunt.log.writeln(`${contractsToDeploy.length} contracts need deployment`)

    if (!web3.isConnected()) {
      grunt.log.error(`Web3 cannot connect on ${options.rpchost}:${options.rpcport}`)
      return done(false)
    }

    deployNextContract()


    function deployNextContract() {
      if (contractsToDeploy.length > 0) {
        const deployment = new Deployment(contractsToDeploy[0])
        deployment.then(() => {
          contractsToDeploy.shift()
          deployNextContract()
        })
      } else {
        grunt.file.write(options.chain, JSON.stringify(chain))
        grunt.log.success(`Deployed all contracts and wrote chain to ${options.chain}`)
        done(true)
      }
    }

    function Deployment(contractName) {

      const deferred = Q.defer()
      const contract = web3.eth.contract(contractsObj[contractName].abi)
      const contractParams = options.contractParams[contractName]
      const txParams = {
        data: hexify(contractsObj[contractName].bytecode),
        gasPrice: web3.toHex(web3.eth.gasPrice)
      }

      txParams.gas = web3.toHex(web3.eth.estimateGas(txParams))

      contract.new.apply(this, contractParams.concat([txParams, (err, txHex) => {
        if (err) {
          grunt.log.error(`Deploying ${contractName} failed: ${err.message}`)
          return done(false)
        }

        grunt.log.writeln(`Deploying ${contractName} with transaction ${txHex}`)

        waitForTx(txHex).then((transactionReceipt) => {

          grunt.log.writeln(`Deployed ${contractName} to ${transactionReceipt.contractAddress}`)

          chain[contractName] = {
            address: hexify(transactionReceipt.contractAddress),
            runtimeBytecode: hexify(web3.eth.getCode(transactionReceipt.contractAddress))
          }

          if (options.onDeploy[contractName]) {
            contracts[contractName] = web3.eth.contract(contractsObj[contractName].abi).at(transactionReceipt.contractAddress)

            options.onDeploy[contractName].forEach((snippet) => {
              grunt.log.writeln(`eval: ${snippet}`)
              try {
                eval(snippet)
              } catch (e) {
                grunt.log.error(e)
                grunt.file.write(options.chain, JSON.stringify(chain))
                done(false)
              }
            })
          }

          deferred.resolve()

        })
      }])

      return deferred.promise
    }

    function hexify(string) {
      if (string.indexOf('0x') === 0) {
        return string
      }
      return `0x${string}`
    }

    function waitForTx(txHex) {
      const deferred = Q.defer()
      const waitInterval = setInterval(() => {

        const txReceipt = web3.eth.getTransactionReceipt(txHex)

        if (!txReceipt) {
          return
        }

        clearInterval(waitInterval)
        deferred.resolve(txReceipt)

      }, 1000)

      return deferred.promise
    }
  })
}
