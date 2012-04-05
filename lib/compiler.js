#!/usr/bin/env node

var fs = require("fs")
var path = require("path")

var parser = require("./parser").generate(function(bi) {
		with(bi) {
			var mbs = maybe("space")
			rule("text", named("text", /^([^@#\$\\]+|\\[^])+/))
			rule("comment", /(^#\*([^\*]+|\*[^#])*\*#)|(^##.+\r?\n?)/)
			rule("space", /^(\s|(^#\*([^\*]+|\*[^#])*\*#)|(^##.+\n?))+/)
			rule("name", named("name", /^[a-zA-Z_][a-zA-Z_0-9]*/))
			rule("number", named("number", /^\d+/))
			rule("string", named("string", and(/^"/, rep(or(
							named("text", /^([^@#\$"\\]+|\\[^])+/),
							"var", "directive", "comment"
						)), /^"/)))
			rule("array", named("array", and(/^\[/, mbs, maybe(join("value", "space")), mbs, /^\]/)))
			rule("hash", named("hash", and(/^\{/, mbs, maybe(join("pair", "space")), mbs, /^\}/)))
			rule("text_value", or("name", "number", "var", "string", "directive", "simple_var"))
			rule("value", or("name", "number", "var", "string", "directive", "array", "hash", "simple_var"))
			rule("pair", named("pair", and("text_value", mbs, /^:/ , mbs, "value")))
			rule("directive", named("directive", and(/^@/, "name", mbs, /^\(/, mbs, named("file_name", /^"([^"\\]|\\[^])+"/), mbs, /^\)/)))
			function arg_list(s, e) {
				with(bi) {
					return named("args", and(s, mbs, maybe(join(or("pair", "value"), "space")), mbs, e))
				}
			}
			rule("index", named("index", and(/^\[/, mbs, "text_value", mbs, /^\]/)))

			rule("filter", and(mbs, /^\|/, mbs, named("filter", named("var", and("name", rep(or(and(/^./, "name"), and(mbs, "index"))))))))
			var _var = and(maybe("name"),
				rep(or(and(/^\./, "name"), and(mbs, "index"))),
				maybe(named("call", and(mbs, arg_list(/^\(/, /^\)/), maybe(and(mbs, "block"))))),
				rep("filter"));
			rule("simple_var", named("var", and(/^\$/, maybe("name"), rep(or(and(/^./, "name"), and(mbs, "index"))))))
			rule("var", named("var", and(/^\$\{/, _var, /^\}/)))
			rule("block", named("block", and(maybe(arg_list(/^\|/, /^\|/)), mbs, /^#/, and(rep(or("text", "comment", "var", "directive")), /^#end/))))
			main_rule(rep(or("text", "comment", "var", "directive")))
		}
	})

function parse_string(file_name, string, include_fn, parse_fn) {
	function unescape_str(str) {
		return str.replace(/\\[^]/g, function(m) {
				return m.substring(1, 2)
			})
	}
	function get_val(nd) {
		var c = nd.children || []
		var r = "$ctx"
		for(var i=0; i<c.length; i++)
			if(c[i].name!='call' && c[i].name!='filter')
				r = ["var_index(", r, ", ", val_node(c[i]), ")"].join("")
		return r
	}
	function val_node(nd) {
		if(nd.name=="name") {
			return JSON.stringify(nd.value())
		} else if(nd.name=="string") {
			var c = nd.children
			if(!c)
				return "''"
			else if(c.length==1)
				return val_node(c[0])
			else {
				var r = ["(function() {\nvar $out = [];\n"]
				for(var i=0; i<c.length; i++)
					r.push(txt_node(c[i]))
				r.push("return $out.join('');\n})()")
				return r.join("")
			}
		} else if(nd.name=="number") {
			return nd.value()
		} else if(nd.name=="text") {
			return JSON.stringify(unescape_str(nd.value()))
		} else if(nd.name=="array") {
			var c = nd.children || []
			var r = []
			for(var i=0; i<c.length; i++)
				r.push(val_node(c[i]))
			return "[" + r.join(", ") + "]"
		} else if(nd.name=="hash") {
			if(!nd.children)
				return "{}"
			var c = nd.children
			var r = ["(function() {\nvar r = {};\n"]
			for(var i=0; i<c.length; i++) {
				r.push("r[")
				r.push(val_node(c[i].children[0]))
				r.push("] = ")
				r.push(val_node(c[i].children[1]))
				r.push(";\n")
			}
			r.push("return r;\n})()")
			return r.join("")
		} else if(nd.name=="index") {
			return val_node(nd.children[0])
		} else if(nd.name=="var") {
			if(!nd.children)
				return "$ctx"
			else {
				for(var i=0; i<nd.children.length; i++) {
					var nm = nd.children[i].name
					if(nm=="call" || nm=="filter") {
						return ["(function() {\nvar $out = [];\n", txt_node(nd), "return $out.join('');\n})()"].join("")
					}
				}
				return get_val(nd)
			}	
		} else if(nd.name=="directive") {
			var c = nd.children
			var nm = path.join(path.dirname(file_name), unescape_str(c[1].value().replace(/^"|"$/g, "")))
			if(c[0].value()=="include") {
				include_fn(nm)
				return ["includes[", JSON.stringify(nm), "]"].join("")
			} else if(c[0].value()=="parse") {
				parse_fn(nm)
				return ["(function() {\nvar $out = [];\nparsed[", JSON.stringify(nm), "]($ctx, $out);\nreturn $out.join('');\n})()"].join("")
			} else
				throw new Error("Unknown directive: " + JSON.stringify())
		} else if(nd.name=="block") {
			var c = nd.children || []
			var r = ["(function(ctx) {\nreturn function($unused, $args, $out) {\nvar $ctx = context(ctx);\n"]
			for(var i=0; i<c.length; i++) {
				if(c[i].name=="args") {
					var al = c[i].children || []
					for(var j=0; j<al.length; j++) {
						if(al[j].name=="pair") {
							var nm = val_node(al[j].children[0])
							r.push("$ctx[" + nm + "] = $args[" + j + "]===undefined ? ($args[" + nm + "]===undefined ? " + val_node(al[j].children[1]) + " : $args[" + nm + "]) : $args[" + j + "];")
						} else {
							var nm = val_node(al[j])
							r.push("$ctx[" + nm + "] = $args[" + j + "]===undefined ? ($args[" + nm + "]===undefined ? null : $args[" + nm + "]) : $args[" + j + "];")
						}
					}
				} else
					r.push(txt_node(c[i]))
			}
			r.push("};\n})($ctx)")
			return r.join("")
		}
	}
	function txt_node(nd) {
		if(nd instanceof Array) {
			var r = []
			for(var i=0; i<nd.length; i++)
				r.push(txt_node(nd[i]))
			return r.join("")
		} else if(nd.name=="directive" && nd.children[0].value()=="parse") {
			var c = nd.children
			var nm = path.join(path.dirname(file_name), unescape_str(c[1].value().replace(/^"|"$/g, "")))
			parse_file(nm)
			return ["parsed[", JSON.stringify(nm), "]($ctx, $out);\n"].join("")
		} else if(nd.name=="var" && nd.children && (nd.children[nd.children.length-1].name=="call" || nd.children[nd.children.length-1].name=="filter")) {
			var fn = get_val(nd)
			var cl = []
			var call_used = false
			for(var i=0; i<nd.children.length; i++) {
				if(nd.children[i].name=="call") {
					cl = nd.children[i].children
					call_used = true
				}
			}
			var r = []
			if(call_used) {
				r = ["(function() {\nvar args = {};\n"]
				if(cl.length>=1) {
					var al = cl[0].children || []
					for(var j=0; j<al.length; j++) {
						if(al[j].name=="pair") {
							r.push("args[")
							r.push(val_node(al[j].children[0]))
							r.push("] = ")
							r.push(val_node(al[j].children[1]))
							r.push(";\n")
						} else {
							r.push("args[")
							r.push(j)
							r.push("] = ")
							r.push(val_node(al[j]))
							r.push(";\n")
						}
					}
				}
				if(cl.length>=2) {
					r.push("args['yield'] = ")
					r.push(val_node(cl[1]))
					r.push(";\n")
				}
				r.push("var_call(")
				r.push(fn)
				r.push(", $ctx, args, $out);\n})();\n")
				r = r.join("")
			} else
				r = get_val(nd)
			for(var i=0; i<nd.children.length; i++) {
				if(nd.children[i].name=="filter") {
					if(call_used) {
						r = ["var_call(",
							get_val(nd.children[i].children[0]),
							", $ctx, [(function() {\nvar $out=[];\n", r, "return $out.join('');\n})()], $out);\n"].join("")
					} else {
						call_used = true
						r = ["var_call(",
							get_val(nd.children[i].children[0]),
							", $ctx, [", r, "], $out);\n"].join("")
					}
				}
			}
			return r
		} else
			return ["$out.push(", val_node(nd), ");\n"].join("")
	}
	return "function($ctx, $out) {\n" + txt_node(parser(string)) + "}\n"
}


function load_plugins(pa, dir, callback) {
	var r = []
	var events_count = 0
	function dec_counter(err) {
		events_count--
		if(callback && (err || events_count<=0)) {
			callback(err ? null : r.join(""), err)
			callback = null
		}
	}
	function push_path(p) {
		r.push("$ctx")
		for(var i=0; i<p.length; i++)
			r.push("[" + JSON.stringify(p[i]) + "]");
		r.push(" = ")
	}
	fs.readdir(dir, function(err, files) {
		if(err)
			dec_counter(err)
		else {
			events_count = files.length
			for(var i=0; i<files.length; i++) {
				(function(file) {
					if(file==="." || file==="..")
						dec_counter(false)
					else {
						fs.stat(path.join(dir, file), function(err, stat) {
							if(err)
								dec_counter(err)
							else if(stat.isDirectory()) {
								load_plugins(pa.concat([file]), path.join(dir, file), function(data, err) {
									r.push(data)
									dec_counter(err)
								})
							} else {
								fs.readFile(path.join(dir, file), "UTF-8", function(err, data) {
									if(err)
										dec_counter(err)
									else {
										push_path(pa.concat([file.replace(/\.js$/i, "")]))
										r.push(data)
										r.push(";\n")
										dec_counter(false)
									}
								})
							}
						})
					}
				})(files[i])
			}
		}
	})
}

var get_plugins = function(cb) {
	var plugins = null
	load_plugins([], path.join(__dirname, "../plugins"), function(data, err) {
		if(!err) {
			get_plugins = function(cb2) {
				cb2(data, err)
			}
		}
		cb(data, err)
	})
}

exports.file_loader = function(root_path) {
	if(!root_path)
		root_path = "./"
	else if(!/\/$/.match(root_path))
		root_path += "/"
	return function(file_name, callback) {
		fs.readFile(root_path + file_name, "UTF-8", callback)
	}
}

exports.compiler = function(file_loader) {
	if(!file_loader)
		file_loader = exports.file_loader()
	var includes = {}
	var parsed = {}
	var compiler_object = {
		include: function(file_name, callback) {
			if(includes[file_name])
				callback(false, compiler_object)
			else {
				includes[file_name] = true
				file_loader(file_name, function(err, data) {
					if(err)
						callback(err, compiler_object)
					else {
						includes[file_name] = data
						callback(false, compiler_object)
					}
				})
			}
			return compiler_object
		},
		parse: function(file_name, callback) {
			if(parsed[file_name])
				callback(false, compiler_object)
			else {
				parsed[file_name] = true
				file_loader(file_name, function(err, data) {
					var events_count = 1
					var finished = false
					function cb(err) {
						if(!finished) {
							callback(err, compiler_object)
							finished = true
						}
					}
					function dec_events(err) {
						events_count--
						if(err || events_count<=0)
							cb(err)
					}
					try {
						parsed[file_name] = parse_string(file_name, data, function(fname) {
							events_count++
							compiler_object.include(fname, dec_events)
						}, function(fname) {
							events_count++
							compiler_object.parse(fname, dec_events)
						})
					} catch(e) {
						dec_events(e)
					}
					dec_events(false)
				})
			}
			return compiler_object
		},
		create_source: function(function_name, callback) {
			var r = ["function ", function_name, "(file_name, ctx) {\n"]
			r.push("function context() { if(arguments.length) { var rfn = function(){}; rfn.prototype = arguments[0]; return new rfn(); } else return {}; };\n")
			r.push("function var_index(v, i) { return v ? v[i] : null; };\n")
			r.push("function var_call(v, ctx, args, out) { if(v && typeof v=='function') v(ctx, args, out); };\n")
			r.push("var $ctx = context(ctx);\n")
			get_plugins(function(data, err) {
				if(err)
					callback(err, null)
				else {
					// plugins
					r.push(data)

					// includes
					r.push("\nvar includes = ")
					r.push(JSON.stringify(includes))
					r.push(";\n")

					// parsed files
					r.push("var parsed = {\n")
					var fst = true
					for(var i in parsed) {
						if(!fst)
							r.push(",\n")
						fst = false
						r.push(JSON.stringify(i))
						r.push(": ")
						r.push(parsed[i])
					}
					r.push("\n};\n")

					// apply template
					r.push("if(!parsed[file_name])\nthrow new Error('File not found: \"' + file_name + '\"');\n")
					r.push("var $out = [];\n")
					r.push("parsed[file_name]($ctx, $out);\n")
					r.push("return $out.join('');\n")
					r.push("}\n")
					callback(null, r.join(""))
				}
			})
		},
		create_function: function(callback) {
			compiler_object.create_source("", function(err, source) {
				try {
					callback(err, err ? null : eval(["(", source, ")"].join("")))
				} catch(e) {
					callback(e, null)
				}
			})
		}
	}
	return compiler_object
}




