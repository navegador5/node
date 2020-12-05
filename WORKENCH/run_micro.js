function tst() {
    function then_func(r) {console.log("in then:",r)}
    var p = new Promise(
        (rs,rj)=>{
            setTimeout(
                ()=>{rs("resolved")},
                3000
            )
        }
    )
    p.then(then_func)
}

tst()
