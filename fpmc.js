var
	sy = require('sylvester'),
	
	lambda   = 0.2,
	sigma    = 0.2,
	sigma_sq = Math.pow(sigma, 2);
	kui      = 8, /* kui = kil ∈ {8, 16, 32, 64, 128} */
	kil      = 8,
	
	N = function(mean, stddev) {
		return (Math.random() * 2 - 1) * stddev + mean;
	},
	
	// returns n x m Matrix, filled with normal distributed noise
	initNormalMatrix = function(n, m, mean, stddev) {
		return sy.Matrix.Zero(n, m).map(function() {
			return N(mean, stddev);
		});
	}
	

	;


/* monkey patch sylvester Matrix class */
sy.Matrix.prototype.setE = function(i, j, v) {
	if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) { return null; }
	this.elements[i - 1][j - 1] = v;
	return v;
}



learn_fpmc = function learn_fpmc(s, learning_rate, reg_param, iterations) {
	
	var
		u_count = 0,
		i_count = 0,
		l_count = 0,
		B = {},
		yhat = function(u, t, i) {
			ymf  = vui.col(u).dot(viu.col(i));
			l = B[u][t-1];
			if(typeof l === "undefined") {
				yfmc = 0;
			} else {
				yfmc = vil.col(i).dot(vli.col(l));				
			}
			return ymf + yfmc;
		}
		;
	
	for(var ti = 0; ti < s.length; ti++) {
		u = s[ti][0];
		t = s[ti][1];
		i = s[ti][2];
		u_count = Math.max(u_count, u);
		i_count = Math.max(i_count, i);
		l_count = i_count;
		
		if(!(u in B)) {
			B[u] = [];
		}
		B[u][t] = i;
	}
	
	/* draw VU,I VI,U VI,L VL,I from N(0,σ^2) */
	var
		vui = initNormalMatrix(u_count * kui, i_count * kui, 0, sigma_sq),
		viu = initNormalMatrix(i_count * kui, u_count * kui, 0, sigma_sq),
		vil = initNormalMatrix(i_count * kil, l_count * kil, 0, sigma_sq),
		vli = initNormalMatrix(l_count * kil, i_count * kil, 0, sigma_sq)
		;
	
	
	for(it = 0; it < iterations; it++) {
		
		
		/* draw (u,t,i) uniformly from S */
		uti = s[Math.floor(Math.random() * s.length)];
		u = uti[0];
		t = uti[1];
		i = uti[2];
		
		/* draw j uniformly from (I \ Btu ) */
		do {
			j = s[Math.floor(Math.random() * s.length)][2]
		} while(j != i);


		/* δ ← ( 1 − σ( ŷ(u,t,i) − ŷ(u,t,j) ) ) */
		delta = (1 - sigma * (yhat(u, t, i) - yhat(u, t, j)))
		
		
		/* for f ∈ {1,...,kU,I} do */
		for(f = 1; f <= kui; f++) {			
			vui.setE(u, f,
				vui.e(u, f) + learning_rate * (  delta * (viu.e(i, f) - viu.e(j, f)) - reg_param * vui.e(u, f) )
			);
			
			viu.setE(i, f,
				viu.e(i, f) + learning_rate * (  delta * vui.e(u, f) - reg_param * viu.e(i, f) )
			);
			
			viu.setE(j, f,
				vui.e(j, f) + learning_rate * ( -delta * vui.e(u, f) - reg_param * vui.e(j, f) )
			);
		}
		
		l = B[u][t-1];
		if(typeof l === "undefined") {
			eta = 0;
		} else {
			eta = vli.e(l, f);
		}
				
		for(f = 1; f <= kil; f++) {
			vil.setE(i, f,
				vil.e(i, f) + learning_rate * (  delta * eta - reg_param * vil.e(i, f) )
			);
			
			vil.setE(j, f,
				vil.e(j, f) + learning_rate * ( -delta * eta - reg_param * vil.e(j, f) )
			);
			
			if(typeof l !== "undefined") {
				vli.setE(l, f,
					vli.e(l, f) + learning_rate * (  delta * (vil.e(i, f) - vil.e(j, f)) - reg_param * vli.e(l, f) )
				);
			}
		}
	}
	return [
		vui,
		viu,
		vil,
		vli
	]
}

console.log(learn_fpmc(
	[
		[1, 1, 1],
		[1, 2, 2],
		[2, 1, 1],
		[2, 2, 2],
		[3, 1, 3],
		[3, 2, 4],
		[4, 1, 3]
	],
	0.05,
	lambda,
	3000
	)
);