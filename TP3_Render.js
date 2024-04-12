TP3.Render = {
    drawTreeRough: function (rootNode, scene, alpha, radialDivisions = 8, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
        var nodes = [];
        var branchGeometries = [];
        var leafGeometries = [];
        var appleGeometries = [];

        nodes.push(rootNode);

        while (nodes.length > 0) {
            var currentNode = nodes.pop();
            var height = currentNode.p0.distanceTo(currentNode.p1);

            for (var i = 0; i < currentNode.childNode.length; i++) {
                nodes.push(currentNode.childNode[i]);
            }

            var cylinderGeometry = new THREE.CylinderBufferGeometry(currentNode.a1, currentNode.a0, height, radialDivisions);
            cylinderGeometry.translate(0, height / 2, 0);
            var branchDirection = currentNode.p1.sub(currentNode.p0).normalize();
            var quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), branchDirection);
            cylinderGeometry.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quaternion));
            cylinderGeometry.translate(0, -height / 2, 0);
            cylinderGeometry.translate(currentNode.p0.x, currentNode.p0.y, currentNode.p0.z);
            cylinderGeometry.applyMatrix4(matrix);

            branchGeometries.push(cylinderGeometry);

            if (currentNode.a0 < alpha * leavesCutoff) {
                for (var i = 0; i < leavesDensity; i++) {

                    var leafGeometry = new THREE.PlaneBufferGeometry(alpha / 2, alpha / 2);
                    var leafX = (Math.random() - 0.5) * alpha;
                    var leafY = (currentNode.childNode.length == 0) ? Math.random() * height : Math.random() * (height + alpha);
                    var leafZ = (Math.random() - 0.5) * alpha;
                    var leafPosition = new THREE.Vector3(leafX, leafY, leafZ);

                    //applique la même rotation que la branche sur laquelle se trouve la feuille
                    leafPosition.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quaternion));
                    //déplace la feuille à la position de départ de la branche
                    leafPosition.add(new THREE.Vector3(currentNode.p0.x, currentNode.p0.y - 0.5 * alpha, currentNode.p0.z));
                    // applique une rotation aléatoire à la feuille
                    var randomRotation = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
                    leafGeometry.lookAt(randomRotation);
                    leafGeometry.translate(leafPosition.x, leafPosition.y, leafPosition.z);
                    leafGeometry.applyMatrix4(matrix);
                    leafGeometries.push(leafGeometry);
                }
                //add apple
                if (Math.random() < applesProbability) {
                    var appleGeometry = new THREE.BoxBufferGeometry(alpha / 3, alpha / 3, alpha / 3);
                    var applePosition = currentNode.p0;
                    applePosition.y -= alpha/1.5;
                    appleGeometry.translate(applePosition.x, applePosition.y, applePosition.z);
                    appleGeometry.applyMatrix4(matrix);
                    appleGeometries.push(appleGeometry);
                }
            }

        }

        var mergedBranchGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(branchGeometries);
        var branches = new THREE.Mesh(mergedBranchGeometry, new THREE.MeshLambertMaterial({ color: 0x8B5A2B }));
        var mergedLeafGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(leafGeometries);
        var leaves = new THREE.Mesh(mergedLeafGeometry, new THREE.MeshPhongMaterial({ color: 0x3A5F0B }));
        var mergedAppleGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(appleGeometries);
        var apples = new THREE.Mesh(mergedAppleGeometry, new THREE.MeshPhongMaterial({color: 0x5F0B0B}));

        branches.castShadow = true;
        branches.receiveShadow = true;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        scene.add(branches);
        scene.add(leaves);
        scene.add(apples);
    },

	drawTreeHermite: function (rootNode, scene, alpha, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
		//TODO
		//let nodes = [];
		let branchGeometries = [];
		let leafGeometries = [];
		let appleGeometries = [];

		//On créé liste en partant du sommet initial, dans laquelle on va itérer
		const sommets = [];
		const sommetsPts = [];
		sommets.push(rootNode);

		
		/* //Aide print
		//sommets.push(rootNode.sections[0].x, rootNode.sections[0].y, rootNode.sections[0].z);
		//console.log(rootNode.sections[0][0].x); //Get
		//console.log(rootNode);
		*/

		//On veut passer à travers toutes les nodes
		// donc, devrait tjrs avoir juste un seul node dans sommet, quand yen a pu, ben on a finit
		while (sommets.length > 0) {
			let currentNode = sommets.pop();
			var height = currentNode.p0.distanceTo(currentNode.p1);


			//On passe à travers tous les noeuds enfants
			//Si la longueur d'un enfant est 0, alors c'est le dernier node de ce chemin
			for (let i = 0; i < currentNode.childNode.length; i++) {
				//Je laisse le let pour l'instant pcq pt que je vais y retoucher plus tard
				//let currentChildNode = currentNode.childNode[i];
				//sommets.push(currentChildNode);
				sommets.push(currentNode.childNode[i]);
			}


			//On passe à travers les 5 sections
			for(let j = 0; j < 4; j++){
				//On passe à travers les 5 sous-sections
				//On part du bas et on va vers le haut en passant par les points en sense antihoraire
				for (let k = 4; k >= 0; k--){
					//let k = 4,
					//On push les pts
					sommetsPts.push(currentNode.sections[j][k].x, currentNode.sections[j][k].y, currentNode.sections[j][k].z);
				} //En passant à travers la liste à l'envers, on obtient l'ordre antihoraire
			}



			//COPIÉ --------------------------------------------------------------------------------------------------------------------------------
			var branchDirection = currentNode.p1.sub(currentNode.p0).normalize();
			var quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), branchDirection);
			if (currentNode.a0 < alpha * leavesCutoff) {
				for (var i = 0; i < leavesDensity; i++) {

					var leafGeometry = new THREE.PlaneBufferGeometry(alpha / 2, alpha / 2);
					var leafX = (Math.random() - 0.5) * alpha;
					var leafY = (currentNode.childNode.length == 0) ? Math.random() * height : Math.random() * (height + alpha);
					var leafZ = (Math.random() - 0.5) * alpha;
					var leafPosition = new THREE.Vector3(leafX, leafY, leafZ);

					//applique la même rotation que la branche sur laquelle se trouve la feuille
					leafPosition.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quaternion));
					//déplace la feuille à la position de départ de la branche
					leafPosition.add(new THREE.Vector3(currentNode.p0.x, currentNode.p0.y - 0.5 * alpha, currentNode.p0.z));
					// applique une rotation aléatoire à la feuille
					var randomRotation = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
					leafGeometry.lookAt(randomRotation);
					leafGeometry.translate(leafPosition.x, leafPosition.y, leafPosition.z);
					leafGeometry.applyMatrix4(matrix);
					leafGeometries.push(leafGeometry);
				}
				//add apple
				if (Math.random() < applesProbability) {
					var appleGeometry = new THREE.BoxBufferGeometry(alpha / 3, alpha / 3, alpha / 3);
					var applePosition = currentNode.p0;
					applePosition.y -= alpha/1.5;
					appleGeometry.translate(applePosition.x, applePosition.y, applePosition.z);
					appleGeometry.applyMatrix4(matrix);
					appleGeometries.push(appleGeometry);
				}
			}
		}
		const f32sommets = new Float32Array(sommetsPts);
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute("position", new THREE.BufferAttribute(f32sommets, 3));
		const facesIdx = [];
		//Faire une boucle pour mettre les indices dans le bon ordre -> antihoraire
		for (let indice = 0; indice < sommetsPts.length - 5; indice++){
			//JSP dans quel ordre faire les indices
			facesIdx.push(indice, indice + 1, indice + 5);
			facesIdx.push(indice + 5, indice + 1, indice + 6);
			/*
			if (indice % 4 === 0){
				//Si on est à 4, alors on est à l'extrémité, on veut retourner au début et non continuer
				facesIdx.push(indice, indice - 4, indice + 1);
				facesIdx.push(indice + 1, indice - 4, indice + 2);
			}else{
				facesIdx.push(indice, indice + 1, indice + 5);
				facesIdx.push(indice + 5, indice + 1, indice + 6);
			}*/

		}

		geometry.setIndex(facesIdx);
		geometry.computeVertexNormals();

		//COPIÉ --------------------------------------------------------------------------------------------------------------------------------
		var mergedLeafGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(leafGeometries);
		var leaves = new THREE.Mesh(mergedLeafGeometry, new THREE.MeshPhongMaterial({ color: 0x3A5F0B }));
		var mergedAppleGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(appleGeometries);
		var apples = new THREE.Mesh(mergedAppleGeometry, new THREE.MeshPhongMaterial({color: 0x5F0B0B}));

		//FIN de la fonction
		const material = new THREE.MeshPhongMaterial({color : 0xff0000})
		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
		scene.add(leaves);
		scene.add(apples);
		return geometry
    },

	updateTreeHermite: function (trunkGeometryBuffer, leavesGeometryBuffer, applesGeometryBuffer, rootNode) {
		//TODO
	},

	drawTreeSkeleton: function (rootNode, scene, color = 0xffffff, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.LineBasicMaterial({ color: color });
		var line = new THREE.LineSegments(geometry, material);
		line.applyMatrix4(matrix);
		scene.add(line);

		return line.geometry;
	},

	updateTreeSkeleton: function (geometryBuffer, rootNode) {

		var stack = [];
		stack.push(rootNode);

		var idx = 0;
		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			geometryBuffer[idx * 6] = currentNode.p0.x;
			geometryBuffer[idx * 6 + 1] = currentNode.p0.y;
			geometryBuffer[idx * 6 + 2] = currentNode.p0.z;
			geometryBuffer[idx * 6 + 3] = currentNode.p1.x;
			geometryBuffer[idx * 6 + 4] = currentNode.p1.y;
			geometryBuffer[idx * 6 + 5] = currentNode.p1.z;

			idx++;
		}
	},


	drawTreeNodes: function (rootNode, scene, color = 0x00ff00, size = 0.05, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.PointsMaterial({ color: color, size: size });
		var points = new THREE.Points(geometry, material);
		points.applyMatrix4(matrix);
		scene.add(points);

	},


	drawTreeSegments: function (rootNode, scene, lineColor = 0xff0000, segmentColor = 0xffffff, orientationColor = 0x00ff00, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];
		var pointsS = [];
		var pointsT = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			const segments = currentNode.sections;
			for (var i = 0; i < segments.length - 1; i++) {
				points.push(TP3.Geometry.meanPoint(segments[i]));
				points.push(TP3.Geometry.meanPoint(segments[i + 1]));
			}
			for (var i = 0; i < segments.length; i++) {
				pointsT.push(TP3.Geometry.meanPoint(segments[i]));
				pointsT.push(segments[i][0]);
			}

			for (var i = 0; i < segments.length; i++) {

				for (var j = 0; j < segments[i].length - 1; j++) {
					pointsS.push(segments[i][j]);
					pointsS.push(segments[i][j + 1]);
				}
				pointsS.push(segments[i][0]);
				pointsS.push(segments[i][segments[i].length - 1]);
			}
		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var geometryS = new THREE.BufferGeometry().setFromPoints(pointsS);
		var geometryT = new THREE.BufferGeometry().setFromPoints(pointsT);

		var material = new THREE.LineBasicMaterial({ color: lineColor });
		var materialS = new THREE.LineBasicMaterial({ color: segmentColor });
		var materialT = new THREE.LineBasicMaterial({ color: orientationColor });

		var line = new THREE.LineSegments(geometry, material);
		var lineS = new THREE.LineSegments(geometryS, materialS);
		var lineT = new THREE.LineSegments(geometryT, materialT);

		line.applyMatrix4(matrix);
		lineS.applyMatrix4(matrix);
		lineT.applyMatrix4(matrix);

		scene.add(line);
		scene.add(lineS);
		scene.add(lineT);

	}
}