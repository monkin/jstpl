function($ctx, $args, $out) {
	$out.push(["id", new Date().getTime().toString(), Math.random().toString().replace(/\./g, "")].join("_"))
}
