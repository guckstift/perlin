const amp2 = 1 / Math.sqrt(2 / 4);
const amp3 = 1 / Math.sqrt(3 / 4);

function xorshift(x)
{
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	return x >>> 0;
}

function lerp(x, a, b)
{
	return a + x * (b - a);
}

function smooth(x)
{
	return x * x * x * (x * (x * 6 - 15) + 10);
}

export default class Perlin
{
	constructor(seed)
	{
		let g2x = this.g2x = new Float64Array(512);
		let g2y = this.g2y = new Float64Array(512);
		let g3x = this.g3x = new Float64Array(512);
		let g3y = this.g3y = new Float64Array(512);
		let g3z = this.g3z = new Float64Array(512);
		let px = this.px = new Uint8Array(512);
		let py = this.py = new Uint8Array(512);
		let pz = this.pz = new Uint8Array(512);
		let state = this.state = seed || 3141592653;

		for(let i=0; i<256; i++) {
			let x = 0;
			let y = 0;
			let z = 0;
			let l2 = 0;
			let l3 = 0;
			
			do {
				x = this.rand() / 0xffFFffFF * 2 - 1;
				y = this.rand() / 0xffFFffFF * 2 - 1;
				z = this.rand() / 0xffFFffFF * 2 - 1;
				l2 = x * x + y * y;
				l3 = l2 + z * z;
			} while(l3 > 1);
			
			l2 = Math.sqrt(l2);
			l3 = Math.sqrt(l3);
			g2x[i] = x / l2;
			g2y[i] = y / l2;
			g3x[i] = x / l3;
			g3y[i] = y / l3;
			g3z[i] = z / l3;
			px[i] = i;
			py[i] = i;
			pz[i] = i;
		}

		for(let i=255; i>0; i--) {
			let j = this.rand() % i;
			let t = px[i];
			px[i] = px[i + 256] = px[j];
			px[j] = px[j + 256] = t;
			j = this.rand() % i;
			t = py[i];
			py[i] = py[i + 256] = py[j];
			py[j] = py[j + 256] = t;
			j = this.rand() % i;
			t = pz[i];
			pz[i] = pz[i + 256] = pz[j];
			pz[j] = pz[j + 256] = t;
		}
	}

	rand()
	{
		return this.state = xorshift(this.state);
	}

	perlin2(x, y)
	{
		let ix = Math.floor(x);
		let iy = Math.floor(y);
		x -= ix;
		y -= iy;
		ix &= 255;
		iy &= 255;
		let u = smooth(x), v = smooth(y);
		let X = x - 1, Y = y - 1;
		let px = this.px, py = this.py;
		let g2x = this.g2x, g2y = this.g2y;
		let a = px[ix] + iy, b = px[ix + 1] + iy;
		let aa = py[a], ab = py[a + 1];
		let ba = py[b], bb = py[b + 1];
		aa = g2x[aa] * x + g2y[aa] * y;
		ab = g2x[ab] * x + g2y[ab] * Y;
		ba = g2x[ba] * X + g2y[ba] * y;
		bb = g2x[bb] * X + g2y[bb] * Y;
		
		return lerp(v, lerp(u, aa, ba),
			           lerp(u, ab, bb)) * amp2;
	}

	perlin3(x, y, z)
	{
		let ix = Math.floor(x);
		let iy = Math.floor(y);
		let iz = Math.floor(z);
		x -= ix;
		y -= iy;
		z -= iz;
		ix &= 255;
		iy &= 255;
		iz &= 255;
		let u = fade(x), v = fade(y), w = fade(z);
		let X = x - 1, Y = y - 1, Z = z - 1;
		let px = this.px, py = this.py, pz = this.pz;
		let g3x = this.g3x, g3y = this.g3y, g3z = this.g3z;
		let a = px[ix] + iy, b = px[ix + 1] + iy;
		let aa = py[a] + iz, ab = py[a + 1] + iz;
		let ba = py[b] + iz, bb = py[b + 1] + iz;
		let aaa = pz[aa], aab = pz[aa + 1];
		let aba = pz[ab], abb = pz[ab + 1];
		let baa = pz[ba], bab = pz[ba + 1];
		let bba = pz[bb], bbb = pz[bb + 1];
		aaa = g3x[aaa] * x + g3y[aaa] * y + g3z[aaa] * z;
		aab = g3x[aab] * x + g3y[aab] * y + g3z[aab] * Z;
		aba = g3x[aba] * x + g3y[aba] * Y + g3z[aba] * z;
		abb = g3x[abb] * x + g3y[abb] * Y + g3z[abb] * Z;
		baa = g3x[baa] * X + g3y[baa] * y + g3z[baa] * z;
		bab = g3x[bab] * X + g3y[bab] * y + g3z[bab] * Z;
		bba = g3x[bba] * X + g3y[bba] * Y + g3z[bba] * z;
		bbb = g3x[bbb] * X + g3y[bbb] * Y + g3z[bbb] * Z;
		
		return lerp(w, lerp(v, lerp(u, aaa, baa),
			                   lerp(u, aba, bba)),
			           lerp(v, lerp(u, aab, bab),
			                   lerp(u, abb, bbb))) * amp3;
	}

	fractal2(o, x, y)
	{
		let f = 0;
		let m = 0;
		let s = 1;
		let a = 1;
		
		for(let i=0; i<o; i++) {
			f += this.perlin2(x * s, y * s) * a;
			m += a;
			s *= 2;
			a *= 0.5;
		}
		
		return f / m;
	}

	fractal3(o, x, y, z)
	{
		let f = 0;
		let m = 0;
		let s = 1;
		let a = 1;
		
		for(let i=0; i<o; i++) {
			f += this.perlin3(x * s, y * s, z * s) * a;
			m += a;
			s *= 2;
			a *= 0.5;
		}
		
		return f / m;
	}
}
