
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
        //on simplifie recursivement:
        rootNode.childNode = rootNode.childNode.map(child => this.simplifySkeleton(child, rotationThreshold));
        
        //si rootNode a seulement un enfant:
        if (rootNode.childNode.length == 1) {
            //on selectionne cet enfant:
            var child = rootNode.childNode[0];
            
            //si la rotation entre l'enfant et le parent est moins que le treshold
            if (this.findRotation(rootNode.p1, child.p0)[1] <= rotationThreshold) {
                //alors on remplace l'enfant(var child) avec l'enfant de l'enfant, si ca fait du sens (┬┬﹏┬┬) 
                rootNode.childNode = child.childNode.map(node => {
                    node.parentNode = rootNode;
                    return node;
                });

                //puis on update l'enfant du parent et le parent de l'enfant:
                rootNode.p1 = child.p1;
                rootNode.a1 = child.a1;
            }
        }

        //on retour l'enfant si il a ete modif:
        return rootNode;
    },

    generateSegmentsHermite: function (rootNode, lengthDivisions = 4, radialDivisions = 8) {
        //on init la pile initiale
        var pile = [rootNode];
        
        //tant qu'il y a encore des nodes:
        while (pile.length > 0) {
            //on recup le node actuel de la pile:
            var nodeActuel = pile.pop();

            //on calcule la direction du parent
            //si pas de parent => on utiliser sa propre direction:
            var parentDirection = (nodeActuel.parentNode?.p1 
                || nodeActuel.p1).clone().sub(nodeActuel.parentNode?.p0 || nodeActuel.p0);
                
            //on ajoute tout les enfants a la pile:    
            pile.push(...nodeActuel.childNode);

            //on init toutes les enfants de la section actuel:
            nodeActuel.sections = Array.from({length: lengthDivisions + 1}, (_, divisionIndex) => {
                //interpolationParameter = t qu'on utilise dans les interpolations
                var interpolationParameter = divisionIndex / lengthDivisions;

                //on calcule le point sur la courbe et la direction a ce point
                var [curvePoint, directionVector] = this.hermite(nodeActuel.p0, nodeActuel.p1,
                     parentDirection, nodeActuel.p1.clone().sub(nodeActuel.p0), interpolationParameter);
    
                //on calcule les points sur le cercle autour du point de la courbe
                return Array.from({length: radialDivisions}, (_, radialIndex) => {

                    //puis on calcule le rayon + angle du point du cercle
                    var radius = nodeActuel.a0 + (nodeActuel.a1 - nodeActuel.a0) * interpolationParameter;
                    var angle = 2 * Math.PI * radialIndex / radialDivisions;

                    //ensuite on calcule le point sur le cercle
                    var circlePoint = new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));

                    //rotation qui aligne le point du cercle avec le point de la courbe
                    circlePoint.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), directionVector)));
                    
                    //finalement on deplace ce point au centre
                    return circlePoint.add(curvePoint);
                });
            });
        }
        
        return rootNode;
    },

    hermite: function (h0, h1, v0, v1, t) {

        //calcul des points de controles:
        var p0 = h0.clone();
        var p1 = h0.clone().add(v0.clone().multiplyScalar(1/3));
        var p2 = h1.clone().sub(v1.clone().multiplyScalar(1/3));
        var p3 = h1.clone();

        //interpolation lineaire entre les points de controles:
        p0.lerp(p1, t);
        p1.lerp(p2, t);
        p2.lerp(p3, t);

        //interpolation linwaire entre les resultats
        p0.lerp(p1, t);
        p1.lerp(p2, t);

        //calcul du vecteur directionnel et du point sur la courbe:
        const dp = p1.clone().sub(p0).normalize();
        const p = p0.lerp(p1, t);

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