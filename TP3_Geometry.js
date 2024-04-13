
class Node {
	constructor(parentNode) {
		this.parentNode = parentNode; //Noeud parent
		this.childNode = []; //Noeud enfants

		this.p0 = null; //Position de depart de la branche
		this.p1 = null; //Position finale de la branche

		this.a0 = null; //Rayon de la branche a p0
		this.a1 = null; //Rayon de la branche a p1

		this.sections = null; //Liste contenant une liste de points representant les segments circulaires du cylindre generalise
	}
}

TP3.Geometry = {

    simplifySkeleton: function (rootNode, rotationThreshold = 0.0001) {
        // Condition d'arrêt : Si le noeud racine n'a pas d'enfant, alors on retourne le noeud sans modification
        if (rootNode.childNode.length === 0) return rootNode;

        // Parcours de tous les enfants du noeud racine
        for (let i = 0; i < rootNode.childNode.length; i++) {
            // Appeler récursivement la fonction sur chaque enfant
            rootNode.childNode[i] = this.simplifySkeleton(rootNode.childNode[i], rotationThreshold);
        }

        // Si le noeud racine a un seul enfant
        if (rootNode.childNode.length === 1) {
            const child = rootNode.childNode[0];

            // Vérifier si la rotation entre le parent et l'enfant est inférieure au seuil
            if (this.findRotation(rootNode.p1, child.p0)[1] <= rotationThreshold) {
                // Mettre à jour les valeurs du parent
                rootNode.childNode = child.childNode; // Remplacer les enfants du parent par les enfants de l'enfant
                for (let i = 0; i < rootNode.childNode.length; i++) {
                    rootNode.childNode[i].parentNode = rootNode; // Mettre à jour les parents des nouveaux enfants
                }
                rootNode.p1 = child.p1; // Mettre à jour la position finale du parent
                rootNode.a1 = child.a1; // Mettre à jour l'angle final du parent
                // Retourner le noeud parent mis à jour
                return rootNode;
            }
        }

        // Retourner le noeud principal de l'arbre
        return rootNode;
    },


    generateSegmentsHermite: function (rootNode, lengthDivisions = 4, radialDivisions = 8) {
        var stack = [];
        stack.push(rootNode);

        while (stack.length > 0) {
            var currentNode = stack.pop();

            // Si le nœud actuel n'a pas de nœud parent, utilisez la direction p1 - p0 pour le parentDirection
            var parentDirection;
            if (currentNode.parentNode === null) {
                parentDirection = currentNode.p1.clone().sub(currentNode.p0);
            } else {
                parentDirection = currentNode.parentNode.p1.clone().sub(currentNode.parentNode.p0);
            }

            for (var i = 0; i < currentNode.childNode.length; i++) {
                stack.push(currentNode.childNode[i]);
            }

            currentNode.sections = [];

            var rotationMatrix = new THREE.Matrix4();
            for (var i = 0; i <= lengthDivisions; i++) {
                var t = i / lengthDivisions;
                var hermite = this.hermite(currentNode.p0, currentNode.p1, parentDirection, currentNode.p1.clone().sub(currentNode.p0), t);
                var p = hermite[0];
                dp = hermite[1];

                var section = [];
                // Créer une base orthogonale
                for (var j = 0; j < radialDivisions; j++) {
                    var radius = currentNode.a0 + (currentNode.a1 - currentNode.a0) * t;
                    var angle = 2 * Math.PI * j / radialDivisions;

                    // Calculer le point sur le cercle en utilisant la base orthogonale
                    var point = new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
                    var quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dp);
                    point.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quaternion));
                    point.add(p);
                    section.push(point);
                }

                currentNode.sections.push(section);
            }
        }
        return rootNode;
    },

    hermite: function (h0, h1, v0, v1, t) {

        var p0 = h0.clone();
        var p1 = h0.clone().add(v0.clone().multiplyScalar(1/3));
        var p2 = h1.clone().sub(v1.clone().multiplyScalar(1/3));
        var p3 = h1.clone();

        p0 = p0.multiplyScalar(1 - t).add(p1.clone().multiplyScalar(t));
        p1 = p1.multiplyScalar(1 - t).add(p2.clone().multiplyScalar(t));
        p2 = p2.multiplyScalar(1 - t).add(p3.clone().multiplyScalar(t));

        p0 = p0.multiplyScalar(1 - t).add(p1.clone().multiplyScalar(t));
        p1 = p1.multiplyScalar(1 - t).add(p2.clone().multiplyScalar(t));

        var dp = p1.clone().sub(p0.clone()).normalize();
        var p = p0.clone().multiplyScalar(1 - t).add(p1.clone().multiplyScalar(t));

        return [p, dp];
    },

	// Trouver l'axe et l'angle de rotation entre deux vecteurs
	findRotation: function (a, b) {
		const axis = new THREE.Vector3().crossVectors(a, b).normalize();
		var c = a.dot(b) / (a.length() * b.length());

		if (c < -1) {
			c = -1;
		} else if (c > 1) {
			c = 1;
		}

		const angle = Math.acos(c);

		return [axis, angle];
	},

	// Projeter un vecter a sur b
	project: function (a, b) {
		return b.clone().multiplyScalar(a.dot(b) / (b.lengthSq()));
	},

	// Trouver le vecteur moyen d'une liste de vecteurs
	meanPoint: function (points) {
		var mp = new THREE.Vector3();

		for (var i = 0; i < points.length; i++) {
			mp.add(points[i]);
		}

		return mp.divideScalar(points.length);
	},
};