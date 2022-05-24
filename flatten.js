const fs = require("fs");
const { v4 } = require('uuid')
var jsondb = {};
var delimiter = process.argv[3] ? process.argv[3] : "_";

function deepCopy(obj){
	return JSON.parse(JSON.stringify(obj));
}

function csvEacape(str){
	return str ? '"' + str.replaceAll('"','""').replace(/\n|\r/g, "").trim() + '"' : "";
}

function isObj(x){
	return JSON.stringify(x).startsWith("{");
}

function isArr(x){
	return JSON.stringify(x).startsWith("[");
}

function createTable(x, isArr = false){
	if(!jsondb[x]){
		jsondb[x] = /*isArr ? {thisIsArrTable:{}} : */{};
	}
}

function createEntry(table, pKey, key, data){
	if(!jsondb[table][pKey]){
		jsondb[table][pKey] = {};
	}
	//let str = data + "";
	//jsondb[table][pKey][key] = csvEacape(str);
	jsondb[table][pKey][key] = data;
	jsondb[table][pKey].uuid = pKey.split(".")[0];
	if(pKey.split(".")[1]){
		jsondb[table][pKey].arrId = pKey.split(".")[1];
	}
}

function routerObj(x, table, pKey = "", prefix = "", parentObj = null, parentUUID = null){
	let entry = {};
	createTable(table);
	if(isObj(x)){
		Object.keys(x).forEach((sub) => {
			routerObj(x[sub], table, pKey, (prefix != "" ? prefix + delimiter : "") + sub, parentObj, parentUUID);
		})
	}else if(isArr(x)){
		let tb = /*table + '.' + */prefix;
		createTable(tb, true);
		let uuid = v4();
		/*createEntry(tb, uuid, "parent", pKey);
		createEntry(tb, uuid, "parentObj", table);*/
		let counter = 0;
		x.forEach((sub) => {
			routerObj(sub, tb, uuid + '.' + counter, prefix, table, pKey);
			counter++;
		})
	}else{
		//console.log(x);
		createEntry(table, pKey, prefix, x)
		if(parentObj){
			createEntry(table, pKey, "parentObj", parentObj);
			createEntry(table, pKey, "parentUUID", parentUUID);
		}
	}
}

function flatten(x){
	if(isArr(x)){
		x.forEach((item) => {
			routerObj(item, "main", v4());
		});
	}else if(isObj(x)){
		routerObj(a, "main", v4());
	}
}

function csvEacape(a){
	let str = a ? a + "" : a;
	return str ? '"' + str.replaceAll('"','""').replace(/\n|\r/g, "").trim() + '"' : "";
}

function flatObj2Table(obj){
	let result = {}
	Object.keys(obj).forEach((tableName) => {
		let data = deepCopy(jsondb[tableName]);
		let keys = new Set();
		Object.values(data).forEach(x => Object.keys(x).forEach(y => keys.add(y)));
		keys = [...keys];
		let table = keys.map(x => x.replace(new RegExp("^" + tableName + "_"), "")).map(csvEacape).join(",") + "\n";
		Object.values(data).forEach(item => {
			let line = [];
			keys.forEach(k => {
				line.push(item[k]);
			});
			table += line.map(csvEacape).join(",") + "\n";
		});
		result[process.argv[2] + "." + tableName + ".csv"] = table;
	});
	return result;
}
if(process.argv[2]){
	let input = JSON.parse(fs.readFileSync(process.argv[2]))
	flatten(input);
	fs.writeFileSync(process.argv[2] + ".flatten.json", JSON.stringify(jsondb, null, 2));
	let csvs = flatObj2Table(jsondb);
	Object.keys(csvs).forEach((fn) => {
		fs.writeFileSync(fn, csvs[fn]);
	});
}

/*

let a = {a: 1, b:[1,2,3],c:{d:5}};

routerObj(a, "main", v4());
console.log(JSON.stringify(jsondb))
*/
