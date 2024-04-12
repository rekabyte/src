const appleMass = 0.075;

TP3.Physics = {
	initTree: function (rootNode) {

		this.computeTreeMass(rootNode);

		var stack = [];
		stack.push(rootNode);

		while (stack.length > 0) {
			var currentNode = stack.pop();
			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			currentNode.vel = new THREE.Vector3();
			currentNode.strength = currentNode.a0;
		}
	},

	computeTreeMass: function (node) {
		var mass = 0;

		for (var i = 0; i < node.childNode.length; i++) {
			mass += this.computeTreeMass(node.childNode[i]);
		}
		mass += node.a1;
		if (node.appleIndices !== null) {
			mass += appleMass;
		}
		node.mass = mass;

		return mass;
	},

	applyForces: function (node, dt, time) {

		var u = Math.sin(1 * time) * 4;
		u += Math.sin(2.5 * time) * 2;
		u += Math.sin(5 * time) * 0.4;

		var v = Math.cos(1 * time + 56485) * 4;
		v += Math.cos(2.5 * time + 56485) * 2;
		v += Math.cos(5 * time + 56485) * 0.4;

		// Ajouter le vent
		node.vel.add(new THREE.Vector3(u / Math.sqrt(node.mass), 0, v / Math.sqrt(node.mass)).multiplyScalar(dt));
		// Ajouter la gravite
		node.vel.add(new THREE.Vector3(0, -node.mass, 0).multiplyScalar(dt));

		// TODO: Projection du mouvement, force de restitution et amortissement de la velocite

		// ================== Debut fonction

		// Calculate the counteracting force
		var counterForce = new THREE.Vector3(0, node.mass, 0).multiplyScalar(dt);

		// Add the counteracting force to the node's velocity
		node.vel.add(counterForce);

		// Appliquer aux branches la matrice parent
		if (node.parentNode != null){
			node.p0 = node.parentNode.p1;
			node.matNode = node.parentNode.matNode;
			node.p1.applyMatrix4(node.matNode);
		}

			// Si nous sommes au noeud parent, c'est le temps de commencer
		// une nouvelle matrice de transformation
		else{
			node.matNode = new THREE.Matrix4();
		}

		// La tranformation qu'on va appliquer à p1
		var matTransP1 = new THREE.Matrix4();

		var np0C = node.p0.clone();
		var np1C = node.p1.clone();

		var matNode = node.matNode;

		// Matrices de transformation pour aller à [0,0,0]
		var mat00P0 = new THREE.Matrix4().makeTranslation(-node.p0.x,-node.p0.y,-node.p0.z);
		np0C.applyMatrix4(mat00P0);

		var mat00P1 = new THREE.Matrix4().makeTranslation(-node.p0.x,-node.p0.y,-node.p0.z);
		matTransP1 = new THREE.Matrix4().multiplyMatrices(mat00P1, matTransP1);
		np1C.applyMatrix4(mat00P1);

		// Matrice de transformation pour faire la bonne rotation
		var velo = node.vel.clone().multiplyScalar(dt);
		var nouvPos = new THREE.Vector3().addVectors(np1C, velo);
		var nouvVectNorm = new THREE.Vector3().subVectors(nouvPos, np0C).normalize();
		var anciVectNorm = new THREE.Vector3().subVectors(np1C, np0C).normalize();
		var findRot = TP3.Geometry.findRotation(anciVectNorm, nouvVectNorm);
		var matRot3 = TP3.Geometry.findRotationMatrix(findRot[0], findRot[1]);
		var xAxis = new THREE.Vector3();
		var yAxis = new THREE.Vector3();
		var zAxis = new THREE.Vector3();
		matRot3.extractBasis(xAxis,yAxis,zAxis);
		var matRot4 = new THREE.Matrix4().makeBasis(xAxis,yAxis,zAxis);
		np1C.applyMatrix4(matRot4);

		matTransP1 = new THREE.Matrix4().multiplyMatrices(matRot4, matTransP1);

		// Matrice de transformation pour retourner à la bonne position
		var matAnciP1 = new THREE.Matrix4().makeTranslation(node.p0.x,node.p0.y,node.p0.z);

		matTransP1 = new THREE.Matrix4().multiplyMatrices(matAnciP1, matTransP1);

		// Appliquer toutes les transformations
		node.p1.applyMatrix4(matTransP1);
		node.matNode = new THREE.Matrix4().multiplyMatrices(matTransP1, matNode);

		// Calculer la vraie vélocité après la projection
		var anciPos = node.p1.clone();
		var vectAnciPos = new THREE.Vector3().subVectors(anciPos, node.p0);
		var vectPosActu = new THREE.Vector3().subVectors(node.p1, node.p0);

		//var vraiVol = new THREE.Vector3().subVectors(node.p1, anciPos);
		var vraiVol = new THREE.Vector3().subVectors(vectPosActu, vectAnciPos);


		// Remplacer l'ancienne vélocité par cette vraie vélocité projetée
		node.vel = vraiVol.multiplyScalar(dt);

		// Calculer l'angle de restitution de la branche
		//var normAnciPos = anciPos.clone().normalize();
		//var normNodep1 = node.p1.clone().normalize();
		var normAnciPos = vectAnciPos.clone().normalize();
		var normNodep1 = vectPosActu.clone().normalize();

		var findRotResti = TP3.Geometry.findRotation(normAnciPos, normNodep1);
		var axeResti = findRotResti[0];
		var angleResti = findRotResti[1]**2;

		// Trouver la matrice de rotation de la restitution
		var matRot3Resti = TP3.Geometry.findRotationMatrix(axeResti, angleResti);
		var xAxisResti = new THREE.Vector3();
		var yAxisResti = new THREE.Vector3();
		var zAxisResti = new THREE.Vector3();
		matRot3Resti.extractBasis(xAxisResti,yAxisResti,zAxisResti);
		var matRot4Resti = new THREE.Matrix4().makeBasis(xAxisResti,yAxisResti,zAxisResti);

		// Trouver ou serait le point avec restitution
		var pt = node.p1.clone();
		pt.applyMatrix4(matRot4Resti);

		// Calculer le vecteur de la vélocité de la restitution
		var veloResti = new THREE.Vector3().subVectors(pt, node.p1);
		veloResti.multiplyScalar(0.7*node.a0*1000*dt);

		// La restitution sera appliquée au prohain temps
		node.vel.add(veloResti).multiplyScalar(dt);

		//==================== Fin fonction

		// Appel recursif sur les enfants
		for (var i = 0; i < node.childNode.length; i++) {
			this.applyForces(node.childNode[i], dt, time);
		}
	}
}