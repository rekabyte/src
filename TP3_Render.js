TP3.Render = {

	drawTreeRough: function (rootNode, scene, alpha, radialDivisions = 8, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
		//init la pile et nos arrays de geometries
		var pile = [rootNode];
		var cylindersGeo = [];
		var leavesGeo = [];
		var applesGeo = [];

		//materiaux:
		const branchMaterial = new THREE.MeshLambertMaterial({ color : 0x8B5A2B});
		//j'ai mis leaf en double-sided ici pour debug, a enlever plus tard:
		//const leafMaterial = new THREE.MeshPhongMaterial({side: THREE.DoubleSide ,color : 0x3A5F0B});
		const leafMaterial = new THREE.MeshPhongMaterial({color : 0x3A5F0B});
		const appleMaterial = new THREE.MeshPhongMaterial({color: 0x5F0B0B});

		//tant qu'il y a encore un node a parcourir
		while (pile.length > 0) {
			//on recupere le node actuel
			var nodeActuel = pile.pop();

			//on popule la pile avec tout les nodes possibles
			for (var i = 0; i < nodeActuel.childNode.length; i++) {
				pile.push(nodeActuel.childNode[i]);
			}

			//on calcule le demivecteur
			var demiVecteur = nodeActuel.p1.clone();
			demiVecteur.add(nodeActuel.p0);
			demiVecteur.multiplyScalar(0.5);

			//on calcule distance entre p0 et p1
			var dist = nodeActuel.p0.distanceTo(nodeActuel.p1);
			//geometrie des branches:
			var cylinderGeometry = new THREE.CylinderBufferGeometry(nodeActuel.a0, nodeActuel.a1, dist, radialDivisions);
			cylinderGeometry.rotateX(Math.PI / 2);

			// diff1/diff2 = p0 - p1 / p1 - po
			var diff1 = new THREE.Vector3().subVectors(nodeActuel.p1, nodeActuel.p0).normalize();
			var diff2 = new THREE.Vector3().subVectors(nodeActuel.p0, nodeActuel.p1);
			cylinderGeometry.lookAt(diff2);

			//matrice de translation:
			var translate = new THREE.Matrix4();
			translate.makeTranslation(demiVecteur.x, demiVecteur.y, demiVecteur.z);
			cylinderGeometry.applyMatrix4(translate);

			//creation de feuilles selon sa proba
			if ((nodeActuel.a0 < alpha * leavesCutoff)) {

				//translation des feuilles:
				var transX;
				var transY;
				var transZ;

				//on veut generer `leavesDensity` feuilles par branche
				for (i = 0; i < leavesDensity; i++) {

					//rotation aleatoire pour la feuille
					var leafGeometry = new THREE.PlaneBufferGeometry(alpha, alpha);
					var rotation = Math.random() * 2 * Math.PI;
					leafGeometry.rotateX(rotation);
					leafGeometry.rotateY(rotation);
					leafGeometry.rotateZ(rotation);

					var side = Math.random() < 0.5 ? 1 : -1;

					var radius = ((alpha / 2) * Math.random()) * side;
					var radiusVector = new THREE.Vector3();
					radiusVector = diff2.normalize().cross(new THREE.Vector3(0, 0, 1)).normalize();
					radiusVector.multiplyScalar(radius);
					radiusVector.applyAxisAngle(diff1, rotation);

					//total = 1 + (alpha / length(p1 - p0))
					var total = diff2.multiplyScalar((alpha/diff2.length()) + 1);

					var vector = nodeActuel.childNode.length == 0 ? total : diff2;
					transX = nodeActuel.p0.x + (vector.x * Math.random()) + radiusVector.x;
					transY = nodeActuel.p0.y + (vector.y * Math.random()) + radiusVector.y;
					transZ = nodeActuel.p0.z + (vector.z * Math.random()) + radiusVector.z;

					translate.makeTranslation(transX, transY, transZ);
					leafGeometry.applyMatrix4(translate);

					leavesGeo.push(leafGeometry);
				}
			}

			cylindersGeo.push(cylinderGeometry);

			//ajouter la pomme selon sa proba
			if (Math.random() < applesProbability) {
				var appleGeo = new THREE.BoxBufferGeometry(alpha, alpha, alpha);
				var applePos = nodeActuel.p0;
				applePos.y -= alpha/1.5;
				appleGeo.translate(applePos.x, applePos.y, applePos.z);
				appleGeo.applyMatrix4(matrix);
				applesGeo.push(appleGeo);
			}
		}

		//merge des geometries:
		var cylinderMergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(cylindersGeo);
		var leafMergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(leavesGeo);
		var mergedAppleGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(applesGeo);

		//creation de mesh:
		var cylinders = new THREE.Mesh(cylinderMergedGeo, branchMaterial);
		var leaves = new THREE.Mesh(leafMergedGeo, leafMaterial);
		var apples = new THREE.Mesh(mergedAppleGeo, appleMaterial);

		//finalement on ajoute tout ca a la scene:
		scene.add(cylinders);
		scene.add(leaves);
		scene.add(apples);
	},

	drawTreeHermite: function (rootNode, scene, alpha, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
		//pour stocker les vertices + index
		//pour C2.html
		const sommets = [];
		const index = [];
		
		var sommetsFeuilles = [];
		var appleGeometries = [];
		var pile = [rootNode];

		//parcours tout les nodes
		while (pile.length > 0) {
			var nodeActuel = pile.pop();

			//tant que il y a un node pas encoer fait, on la rajoute dans la pile:
			for (var i=0; i<nodeActuel.childNode.length; i++) {
				pile.push(nodeActuel.childNode[i]);
			}

			//on reinit les indexes:
			nodeActuel.indice = [];
			nodeActuel.leafIndice = [];

			//on check si le node actuel n'est pas parent:
			if (!nodeActuel.parentNode){
				//on init l'array pour ce node
				//et le remplit avec les sommets correspondants:
				nodeActuel.indice[0] = 0;
				for (let i=0;i<nodeActuel.sections[0].length;i++){
					sommets.push(nodeActuel.sections[0][i].x);
					sommets.push(nodeActuel.sections[0][i].y);
					sommets.push(nodeActuel.sections[0][i].z);

				}
			}

			//puis on mets les sommets dans l'array sommets[]
			for (let i=0;i<nodeActuel.sections.length;i++) {
				nodeActuel.indice[i] = sommets.length/3;

				for (let j=0;j<nodeActuel.sections[i].length;j++) {
					sommets.push(nodeActuel.sections[i][j].x);
					sommets.push(nodeActuel.sections[i][j].y);
					sommets.push(nodeActuel.sections[i][j].z);
				}
			}

			//indice du debut de top
			let topIndex;
			//indice du debut de top
			let bottomIndex;

			//on parcours toutes les sections de nodeActuel a part la derniere:
			for (i = 0 ; i < nodeActuel.sections.length - 1 ; i++){

				//si on est a la premiere section et que nodeActuel a un parent:
				if (i==0 && nodeActuel.parentNode){
					//topIndex = indice de la section suivante et bottomIndex = Indice section actuelle
					topIndex = nodeActuel.indice[i+1];
					bottomIndex = nodeActuel.parentNode.indice[nodeActuel.sections.length-1];
				}

				//sinon:
				else{
					topIndex = nodeActuel.indice[i+1];
					bottomIndex = nodeActuel.indice[i];
				}
				

				//pour chaque point dans la section actuelle
				for (let j = 0 ; j < nodeActuel.sections[i].length ; j++) {
					//on calcules les indexes des sommets + on l'ajoute a l'array index[]
					let vertexA = topIndex+j;
					let vertexB = topIndex+(j+1)%5;
					let vertexC = bottomIndex+(j+1)%5;
					index.push(vertexA,vertexB,vertexC);

					//on fait pareil mais pour le triangle suivant:
					vertexA = topIndex+j;
					vertexB = bottomIndex+(j+1)%5;
					vertexC = bottomIndex+j;
					index.push(vertexA,vertexB,vertexC);
				}
			}


			//on push les bons indexes pour le trunc
			if (nodeActuel.childNode.length == 0){
				let index0 = nodeActuel.indice[nodeActuel.sections.length-1];
				index.push(index0 + 0, index0 + 2, index0 + 1);
				index.push(index0 + 2, index0 + 4, index0 + 3);
				index.push(index0 + 2, index0 + 0, index0 + 4);
			}

			//on cree les feuilles ici si la proba est satisfaite
			if ((nodeActuel.a0 < alpha * leavesCutoff)) {

				var transX;
				var transY;
				var transZ;

				//on repete ce bloc selon la densite des feuilles
				//feuilles par branche:
				for (i = 0; i < leavesDensity; i++) {
					nodeActuel.leafIndice.push(sommetsFeuilles.length);

					//rotation aleatoire pour la feuille
					var randomRota = Math.random() * 2 * Math.PI;

					//on cree le triangle qui represente notre feuille:
					var rotate = new THREE.Matrix4();
					var trianglep1 = new THREE.Vector3(alpha / 2, 0, 0);
					var trianglep2 = new THREE.Vector3(alpha / 2, 0, 0);
					var trianglep3 = new THREE.Vector3(alpha / 2, 0, 0);

					rotate.makeRotationY(THREE.MathUtils.degToRad(120));
					trianglep2.applyMatrix4(rotate);
					rotate.makeRotationY(THREE.MathUtils.degToRad(240));
					trianglep3.applyMatrix4(rotate);

					

					//pour les rotations
					//creation de la matrice de rotation
					rotate.makeRotationX(randomRota).multiply(new THREE.Matrix4()
					.makeRotationY(randomRota)).multiply(new THREE.Matrix4().makeRotationZ(randomRota));

					//liste des points du triangle
					let trianglePoints = [trianglep1, trianglep2, trianglep3];

					//on applique la rotation a chaque point du triangle
					for (let point of trianglePoints) {
						point.applyMatrix4(rotate);
					}

					var side = Math.random() < 0.5 ? 1 : -1;
					
					//vec1 = p0 - p1;
					//vec2 = p1 - p0;
					var vec1 = new THREE.Vector3().subVectors(nodeActuel.p0, nodeActuel.p1);
					var vec2 = new THREE.Vector3().subVectors(nodeActuel.p1, nodeActuel.p0);

					var radius = ((alpha / 2) * Math.random()) * side;
					var radiusVector = new THREE.Vector3();
					radiusVector = vec1.normalize().cross(new THREE.Vector3(0, 0, 1)).normalize();
					radiusVector.multiplyScalar(radius);
					radiusVector.applyAxisAngle(vec2, randomRota);

					

					//total = p0 - p1 + alpha
					var total = vec1.multiplyScalar(1+(alpha/vec1.length()));
					
					//on check si nodeActuel a des enfants
					if (nodeActuel.childNode.length == 0) {
						//on calcule les coord de translation en utilisant la var total = p0 - p1 + alpha
						transX = nodeActuel.p0.x + (total.x * Math.random()) + radiusVector.x;
						transY = nodeActuel.p0.y + (total.y * Math.random()) + radiusVector.y;
						transZ = nodeActuel.p0.z + (total.z * Math.random()) + radiusVector.z;
					}
					else {
						//sinon on la calcule avec vec1 qui correspond a p0 - p1;
						transX = nodeActuel.p0.x + (vec1.x * Math.random()) + radiusVector.x;
						transY = nodeActuel.p0.y + (vec1.y * Math.random()) + radiusVector.y;
						transZ = nodeActuel.p0.z + (vec1.z * Math.random()) + radiusVector.z;
					}

					var translate = new THREE.Matrix4().makeTranslation(transX, transY, transZ);

					//appliquer le translate a chaque point du triangle
					//et on l'ajoute ensuite a 'sommetsFeuilles'
					for (let point of trianglePoints) {
						point.applyMatrix4(translate);
						sommetsFeuilles.push(point.x, point.y, point.z);
					}
				
				}

				//pour creer les fameuses pommes:
				if (Math.random() < applesProbability) {
					console.log(nodeActuel.p0);
					//sphere de radius alpha/2, je voulais pas surcharger la pomme de details
					//donc j'ai mis que 4 coupures horizontales et vericales
					//une pomme meriterait-elle vraiment plus que ca?
					var appleGeo = new THREE.SphereBufferGeometry(alpha/2, 4, 4);
					var applePos = nodeActuel.p0;
					applePos.y -= alpha/1.5;
					appleGeo.translate(applePos.x, applePos.y, applePos.z);
					appleGeo.applyMatrix4(matrix);
					appleGeometries.push(appleGeo);
				}

			}
		}

		//TOUCHE FINAL:
		const f32vertices = new Float32Array(sommets);
		const truncGeometry = new THREE.BufferGeometry();
		truncGeometry.setAttribute("position", new THREE.BufferAttribute(f32vertices, 3));
		truncGeometry.setIndex(index);
		truncGeometry.computeVertexNormals();

		const f32leafVertices = new Float32Array(sommetsFeuilles);
		const leafGeometry = new THREE.BufferGeometry();
		leafGeometry.setAttribute("position", new THREE.BufferAttribute(f32leafVertices, 3));
		leafGeometry.computeVertexNormals();

		//les materiaux:
		const branchMaterial = new THREE.MeshLambertMaterial({color : 0x8B5A2B});
		const leafMaterial = new THREE.MeshPhongMaterial({side: THREE.DoubleSide, color : 0x3A5F0B});
		const appleMaterial = new THREE.MeshPhongMaterial({ color: 0x5F0B0B });

		const trunc = new THREE.Mesh( truncGeometry, branchMaterial );
		const leaves = new THREE.Mesh( leafGeometry, leafMaterial );

		scene.add(trunc);
		scene.add(leaves);
		//pour render les pommes:
		for (let i = 0; i < appleGeometries.length; i++) {
			const appleMesh = new THREE.Mesh(appleGeometries[i], appleMaterial);
			scene.add(appleMesh);
		}

		return [truncGeometry, leafGeometry, leafGeometry];
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