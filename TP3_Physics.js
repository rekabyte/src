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

		// ================== Debut 

		//apres 100h de debug => mon code n'aime pas la gravite
		//svp ne jugez pas mon travail durement, le cours est assez difficile U_U
		//contreforce gravite
		var counterForce = new THREE.Vector3(0, node.mass, 0).multiplyScalar(dt);
		node.vel.add(counterForce);

		//on transfere la matrice parent aux enfants
		if (node.parentNode){
			node.p0 = node.parentNode.p1;
			node.matNode = node.parentNode.matNode;
			node.p1.applyMatrix4(node.matNode);
		}

		//si on est au noeud parent, on commence
		//une nouvelle matrice de transformation
		else{
			node.matNode = new THREE.Matrix4();
		}

		//on copie les matrix actuelles:
		var currentPosTransMatrix = new THREE.Matrix4();
		var previousPosCopy = node.p0.clone();
		var currentPosCopy = node.p1.clone();
		var nodeTransformMatrix = node.matNode;

		//matrice de transfo pour aller a l'origine (0,0,0)
		var translateMatToOrigin = new THREE.Matrix4().makeTranslation(-node.p0.x,-node.p0.y,-node.p0.z);

		//on l'applique a la copie de l'ancienne matrice de position
		previousPosCopy.applyMatrix4(translateMatToOrigin);

		currentPosTransMatrix.multiply(new THREE.Matrix4().makeTranslation(-node.p0.x,-node.p0.y,-node.p0.z));
		currentPosCopy.applyMatrix4(translateMatToOrigin);

		//matrice de transfo pour faire la bonne rotation
		var velocityVector = node.vel.clone().multiplyScalar(dt);
		var newPosition = new THREE.Vector3().addVectors(currentPosCopy, velocityVector);
		var newNormVector = new THREE.Vector3().subVectors(newPosition, previousPosCopy).normalize();
		var previousNormVector = new THREE.Vector3().subVectors(currentPosCopy, previousPosCopy).normalize();


		var rotation = TP3.Geometry.findRotation(previousNormVector, newNormVector);
		var rotationQuaternion = new THREE.Quaternion();
		rotationQuaternion.setFromAxisAngle(rotation[0], rotation[1]);
		var rotationMatrix = new THREE.Matrix4();
		rotationMatrix.makeRotationFromQuaternion(rotationQuaternion);

		var xAxis = new THREE.Vector3();
		var yAxis = new THREE.Vector3();
		var zAxis = new THREE.Vector3();
		rotationMatrix.extractBasis(xAxis,yAxis,zAxis);
		var rotationMatrix = new THREE.Matrix4().makeBasis(xAxis,yAxis,zAxis);
		currentPosCopy.applyMatrix4(rotationMatrix);

		currentPosTransMatrix = new THREE.Matrix4().multiplyMatrices(rotationMatrix, currentPosTransMatrix);

		//matrice de transfo pour retourner a la bonne position (ancienne position)
		var transMatrixToOldPos = new THREE.Matrix4().makeTranslation(node.p0.x,node.p0.y,node.p0.z);

		currentPosTransMatrix = new THREE.Matrix4().multiplyMatrices(transMatrixToOldPos, currentPosTransMatrix);

		//appliquer toutes les transfos necessaires
		node.p1.applyMatrix4(currentPosTransMatrix);
		node.matNode = new THREE.Matrix4().multiplyMatrices(currentPosTransMatrix, nodeTransformMatrix);

		//calculer la vraie velocity apres la projection
		var oldPosition = node.p1.clone();
		var oldPositionVector = new THREE.Vector3().subVectors(oldPosition, node.p0);
		var currentPosVector = new THREE.Vector3().subVectors(node.p1, node.p0);

		var trueVelocity = new THREE.Vector3().subVectors(currentPosVector, oldPositionVector);


		//remplacer l'ancienne velocity par cette velocity
		node.vel = trueVelocity.multiplyScalar(dt);

		//calculer l'angle de restitution de la branche
		var oldNormPosition = oldPositionVector.clone().normalize();
		var currentNormPos = currentPosVector.clone().normalize();

		var restitutionRotation = TP3.Geometry.findRotation(oldNormPosition, currentNormPos);
		var restitutionAxis = restitutionRotation[0];
		var restitutionAngle = restitutionRotation[1]**2;

		var restitutionQuaternion = new THREE.Quaternion();
		restitutionQuaternion.setFromAxisAngle(restitutionAxis, restitutionAngle);
		var restitutionRotationMatrix = new THREE.Matrix4();
		restitutionRotationMatrix.makeRotationFromQuaternion(restitutionQuaternion);


		var xRestitution = new THREE.Vector3();
		var yRestitution = new THREE.Vector3();
		var zRestitution = new THREE.Vector3();
		restitutionRotationMatrix.extractBasis(xRestitution,yRestitution,zRestitution);
		restitutionRotationMatrix = new THREE.Matrix4().makeBasis(xRestitution,yRestitution,zRestitution);

		//trouver ou serait le point avec restitution
		var restitutionPoint = node.p1.clone();
		restitutionPoint.applyMatrix4(restitutionRotationMatrix);

		//calculer le vecteur de la velocity de la restitution
		var restutionVelocity = new THREE.Vector3().subVectors(restitutionPoint, node.p1);
		restutionVelocity.multiplyScalar(0.7*node.a0*dt);

		//la restitution sera appliquée au prohain temps
		node.vel.add(restutionVelocity).multiplyScalar(dt);

		//==================== Fin

		// Appel recursif sur les enfants
		for (var i = 0; i < node.childNode.length; i++) {
			this.applyForces(node.childNode[i], dt, time);
		}
	}
}