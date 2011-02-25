{
	escape: function($ctx, $args, $out) {
		if($args[0])
			$out.push(new String($args[0]).replace(/["><]/g, function(s) {
					return { "\"": "&quot;", "<": "&lt;", ">": "&gt;" }[s];
				}))
	}
}
