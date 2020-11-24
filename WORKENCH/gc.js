const { workerData, parentPort }   = require('worker_threads') 
  
while(true) { 
    setTimeout(
        function(){
            workerData.workerData();
            parentPort.postMessage({msg:"cleared one!"})
        }
        1000,  
    )
}
