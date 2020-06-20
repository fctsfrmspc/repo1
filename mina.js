function timeConvert(stamp) {
	let zero = (number) => {
		return (number < 10) ? "0" : ""
	}
	let months = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]
	let instaStamp = new Date(stamp*1000)
	let obj = new Date(instaStamp)
	let today = new Date()
	let hrs = obj.getHours()
	let min = obj.getMinutes()
	let sec = obj.getSeconds()
	let year = obj.getFullYear()
	let month = obj.getMonth()
	let realmonth = months[month]
	let date = obj.getDate()
	let time = hrs + ":" + zero(min) + min
	if (today.getMonth() == instaStamp.getMonth()) {
		if (today.getDate() == instaStamp.getDate()) {
			return ["Heute",time]
		}
		if (today.getDate() == instaStamp.getDate()-1) {
			return ["Gestern",time]
		}
	}
	return [date + ". " + realmonth + " " + year,time]
}

function get_instagram() {
	// GETs raw HTML, looks for window._sharedData which points to the JSON data I want
	// definitely subject to change
	// requires canvas and request
	request.get("https://www.instagram.com/selphiusmelody/", async (err,res,body) => {
		if (err) { return console.log(err)}
		if (res.statusCode == 200) {
			let rawHtml = body
			let findMe = "window._sharedData = "
			let JSONstart = body.indexOf(findMe)
			if (JSONstart != -1) {
				let splitHtml = rawHtml.substring(JSONstart+findMe.length)
				let rawJSON = splitHtml.substring(0,splitHtml.indexOf(";</script>"))
				let json = JSON.parse(rawJSON)
				let entry_data = json['entry_data']
				if (entry_data.hasOwnProperty("ProfilePage")) {
					let edges = findKeyinJSON(json,"edge_owner_to_timeline_media")
					if (edges != null)  {
						let posts = edges["edges"]
						let newPoststoPost = []
						let isFirstElement = true
						for (var post of posts) {
							let content = post["node"]
							let thisTimestamp = content["taken_at_timestamp"]
							if (thisTimestamp > lastInstaTimestamp && lastInstaTimestamp != -1) {
								newPoststoPost.push(post)
							}
							if (isFirstElement) var tempTimestamp = thisTimestamp
							isFirstElement = false
						}
						lastInstaTimestamp = tempTimestamp
						if (newPoststoPost.length > 0) {
							let stringtoPost = ""
							for (var newPost of newPoststoPost) {
								let newContent = newPost["node"]
								var type = newContent["__typename"]
								var thumb_src = newContent["thumbnail_src"]
								const canvas = Canvas.createCanvas(640,640);
							  const ctx = canvas.getContext('2d');
								const background = await Canvas.loadImage(thumb_src);
							  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
								var shortcode = newContent["shortcode"]
								var thisTime = timeConvert(newContent["taken_at_timestamp"])
								stringtoPost = "Neuer Instagram-Post von Mina (" + thisTime[0] + ", " + thisTime[1] + "): <https://www.instagram.com/p/" + shortcode + "/>"
								if(type == "GraphSidecar") {
									if(newContent.hasOwnProperty("edge_sidecar_to_children")) {
										let typeObj = {"GraphVideo":0,"GraphImage":0}
										let newedge = newContent["edge_sidecar_to_children"]
										for(var edg of newedge["edges"]) {
											let anotherNode = edg["node"]
											var thistype = anotherNode["__typename"]
											if(typeObj.hasOwnProperty(thistype)) {
												typeObj[thistype]++
											}
										}
										let s = (num) => { return (num == 1) ? "" : "s" }
										var attachThis = " (" + typeObj["GraphImage"] + " Foto" + s(typeObj["GraphImage"]) + ", " + typeObj["GraphVideo"] + " Video" + s(typeObj["GraphVideo"]) + ")"
										stringtoPost += attachThis
									} else {
										console.log("Mina: Sidecar found, but no nodes")
									}
								} else {
									let typeString = (type == "GraphVideo") ? "(Video)" : "(Foto)"
									stringtoPost += " " + typeString
								}
								const image = new DiscordAttachment(canvas.toBuffer())
								tahc.send(stringtoPost)
								tahc.send(image)
							}
						} else {
							return console.log("Mina: No new posts found [Last timestamp: "+lastInstaTimestamp +"]")
						}
					} else {
						return console.log("Mina: No posts found in JSON")
					}
				} else {
					return console.log("Mina: Captcha requested")
				}
			} else {
				return console.log("Mina: No JSON data found in HTML")
			}
		} else {
			return console.log("Mina: " + res.statusCode + ": " + res.statusMessage)
		}
	})
}
