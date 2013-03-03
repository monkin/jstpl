function($ctx, $args) {
	if($args[0] && $args["yield"]) {
		var arr = $args[0],
			res = "";
		if(arr instanceof Array) {
			for(var i=0; i<arr.length; i++)
				res += $args["yield"]($ctx, {"0": arr[i], "1": i})
		} else {
			for(var i in arr)
				res += $args["yield"]($ctx, {"0": arr[i], "1": i})
		}
		return res
	} else
		return "#each#"
}
