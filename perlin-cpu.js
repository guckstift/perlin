function xorshift32(x)
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

function smoother(x)
{
	return x * x * x * (x * (x * 6 - 15) + 10);
}

function floor(x)
{
	let X = x | 0;
	return X > x ? X - 1 : X;
}

function fract(x)
{
	return x - floor(x);
}

export function perlin(seed)
{
	const amp1   = 2;
	const amp2   = 1 / Math.sqrt(1 / 2);
	const amp3   = 1 / Math.sqrt(3 / 4);
	const amp4   = 1;
	const rand   = () => seed = xorshift32(seed);
	const permx  = new Uint8Array(512);
	const permy  = new Uint8Array(512);
	const permz  = new Uint8Array(512);
	const permw  = new Uint8Array(512);
	const grad1x = new Float64Array(256);
	const grad2x = new Float64Array(256);
	const grad2y = new Float64Array(256);
	const grad3x = new Float64Array(256);
	const grad3y = new Float64Array(256);
	const grad3z = new Float64Array(256);
	const grad4x = new Float64Array(256);
	const grad4y = new Float64Array(256);
	const grad4z = new Float64Array(256);
	const grad4w = new Float64Array(256);


	for(let i = 0; i < 256; i ++) {
		permx[i] = i;
		permy[i] = i;
		permz[i] = i;
		permw[i] = i;

		while(true) {
			let gx     = rand() / 0xffFFffFF * 2 - 1;
			let gy     = rand() / 0xffFFffFF * 2 - 1;
			let gz     = rand() / 0xffFFffFF * 2 - 1;
			let gw     = rand() / 0xffFFffFF * 2 - 1;
			let sqlen1 = gx * gx;
			let sqlen2 = gy * gy + sqlen1;
			let sqlen3 = gz * gz + sqlen2;
			let sqlen4 = gw * gw + sqlen3;

			if(gx != 0  && gy != 0  && gz != 0  && gw != 0 && sqlen4 <= 1) {
				let il1   = 1 / Math.sqrt(sqlen1);
				let il2   = 1 / Math.sqrt(sqlen2);
				let il3   = 1 / Math.sqrt(sqlen3);
				let il4   = 1 / Math.sqrt(sqlen4);
				grad1x[i] = grad1x[i + 256] = amp1 * gx * il1;
				grad2x[i] = grad2x[i + 256] = amp2 * gx * il2;
				grad2y[i] = grad2y[i + 256] = amp2 * gy * il2;
				grad3x[i] = grad3x[i + 256] = amp3 * gx * il3;
				grad3y[i] = grad3y[i + 256] = amp3 * gy * il3;
				grad3z[i] = grad3z[i + 256] = amp3 * gz * il3;
				grad4x[i] = grad4x[i + 256] = amp4 * gx * il4;
				grad4y[i] = grad4y[i + 256] = amp4 * gy * il4;
				grad4z[i] = grad4z[i + 256] = amp4 * gz * il4;
				grad4w[i] = grad4w[i + 256] = amp4 * gw * il4;
				break;
			}
		}
	}

	for(let i = 255; i > 0; i --) {
		let j = rand() % i;
		let k = rand() % i;
		let l = rand() % i;
		let m = rand() % i;
		[permx[i], permx[j]] = [permx[j], permx[i]];
		[permy[i], permy[k]] = [permy[k], permy[i]];
		[permz[i], permz[l]] = [permz[l], permz[i]];
		[permw[i], permw[m]] = [permw[m], permw[i]];
	}

	permx.copyWithin(256, 0, 256);
	permy.copyWithin(256, 0, 256);
	permz.copyWithin(256, 0, 256);
	permw.copyWithin(256, 0, 256);

	function sample1d(x)
	{
		let ix = floor(x) & 255;
		let fx = fract(x);
		let u  = smoother(fx);
		let fX = fx - 1;

		let ia = permx[ix    ];
		let ib = permx[ix + 1];

		return lerp(u,
			grad1x[ia] * fx,
			grad1x[ib] * fX,
		);
	}

	function sample2d(x, y)
	{
		let ix = floor(x) & 255;
		let iy = floor(y) & 255;
		let fx = fract(x);
		let fy = fract(y);
		let u  = smoother(fx);
		let v  = smoother(fy);
		let fX = fx - 1;
		let fY = fy - 1;

		let ia  = permx[ix    ] + iy;
		let ib  = permx[ix + 1] + iy;
		let iaa = permy[ia    ];
		let iab = permy[ib    ];
		let iba = permy[ia + 1];
		let ibb = permy[ib + 1];

		return lerp(v,
			lerp(u,
				grad2x[iaa] * fx + grad2y[iaa] * fy,
				grad2x[iab] * fX + grad2y[iab] * fy,
			),
			lerp(u,
				grad2x[iba] * fx + grad2y[iba] * fY,
				grad2x[ibb] * fX + grad2y[ibb] * fY,
			),
		);
	}

	function sample3d(x, y, z)
	{
		let ix = floor(x) & 255;
		let iy = floor(y) & 255;
		let iz = floor(z) & 255;
		let fx = fract(x);
		let fy = fract(y);
		let fz = fract(z);
		let u  = smoother(fx);
		let v  = smoother(fy);
		let w  = smoother(fz);
		let fX = fx - 1;
		let fY = fy - 1;
		let fZ = fz - 1;

		let ia   = permx[ix    ] + iy;
		let ib   = permx[ix + 1] + iy;
		let iaa  = permy[ia    ] + iz;
		let iab  = permy[ib    ] + iz;
		let iba  = permy[ia + 1] + iz;
		let ibb  = permy[ib + 1] + iz;
		let iaaa = permz[iaa];
		let iaab = permz[iab];
		let iaba = permz[iba];
		let iabb = permz[ibb];
		let ibaa = permz[iaa + 1];
		let ibab = permz[iab + 1];
		let ibba = permz[iba + 1];
		let ibbb = permz[ibb + 1];

		return lerp(w,
			lerp(v,
				lerp(u,
					grad3x[iaaa] * fx + grad3y[iaaa] * fy + grad3z[iaaa] * fz,
					grad3x[iaab] * fX + grad3y[iaab] * fy + grad3z[iaab] * fz,
				),
				lerp(u,
					grad3x[iaba] * fx + grad3y[iaba] * fY + grad3z[iaba] * fz,
					grad3x[iabb] * fX + grad3y[iabb] * fY + grad3z[iabb] * fz,
				),
			),
			lerp(v,
				lerp(u,
					grad3x[ibaa] * fx + grad3y[ibaa] * fy + grad3z[ibaa] * fZ,
					grad3x[ibab] * fX + grad3y[ibab] * fy + grad3z[ibab] * fZ,
				),
				lerp(u,
					grad3x[ibba] * fx + grad3y[ibba] * fY + grad3z[ibba] * fZ,
					grad3x[ibbb] * fX + grad3y[ibbb] * fY + grad3z[ibbb] * fZ,
				),
			),
		);
	}

	function sample4d(x, y, z, w)
	{
		let ix = floor(x) & 255;
		let iy = floor(y) & 255;
		let iz = floor(z) & 255;
		let iw = floor(w) & 255;
		let fx = fract(x);
		let fy = fract(y);
		let fz = fract(z);
		let fw = fract(w);
		let r  = smoother(fx);
		let s  = smoother(fy);
		let t  = smoother(fz);
		let u  = smoother(fw);
		let fX  = fx - 1;
		let fY  = fy - 1;
		let fZ  = fz - 1;
		let fW  = fw - 1;

		let ia    = permx[ix     ] + iy;
		let ib    = permx[ix + 1 ] + iy;
		let iaa   = permy[ia     ] + iz;
		let iab   = permy[ib     ] + iz;
		let iba   = permy[ia + 1 ] + iz;
		let ibb   = permy[ib + 1 ] + iz;
		let iaaa  = permz[iaa    ] + iw;
		let iaab  = permz[iab    ] + iw;
		let iaba  = permz[iba    ] + iw;
		let iabb  = permz[ibb    ] + iw;
		let ibaa  = permz[iaa + 1] + iw;
		let ibab  = permz[iab + 1] + iw;
		let ibba  = permz[iba + 1] + iw;
		let ibbb  = permz[ibb + 1] + iw;
		let iaaaa = permw[iaaa];
		let iaaab = permw[iaab];
		let iaaba = permw[iaba];
		let iaabb = permw[iabb];
		let iabaa = permw[ibaa];
		let iabab = permw[ibab];
		let iabba = permw[ibba];
		let iabbb = permw[ibbb];
		let ibaaa = permw[iaaa + 1];
		let ibaab = permw[iaab + 1];
		let ibaba = permw[iaba + 1];
		let ibabb = permw[iabb + 1];
		let ibbaa = permw[ibaa + 1];
		let ibbab = permw[ibab + 1];
		let ibbba = permw[ibba + 1];
		let ibbbb = permw[ibbb + 1];

		return lerp(u,
			lerp(t,
				lerp(s,
					lerp(r,
						grad4x[iaaaa] * fx + grad4y[iaaaa] * fy +
						grad4z[iaaaa] * fz + grad4w[iaaaa] * fw,
						grad4x[iaaab] * fX + grad4y[iaaab] * fy +
						grad4z[iaaab] * fz + grad4w[iaaab] * fw,
					),
					lerp(r,
						grad4x[iaaba] * fx + grad4y[iaaba] * fY +
						grad4z[iaaba] * fz + grad4w[iaaba] * fw,
						grad4x[iaabb] * fX + grad4y[iaabb] * fY +
						grad4z[iaabb] * fz + grad4w[iaabb] * fw,
					),
				),
				lerp(s,
					lerp(r,
						grad4x[iabaa] * fx + grad4y[iabaa] * fy +
						grad4z[iabaa] * fZ + grad4w[iabaa] * fw,
						grad4x[iabab] * fX + grad4y[iabab] * fy +
						grad4z[iabab] * fZ + grad4w[iabab] * fw,
					),
					lerp(r,
						grad4x[iabba] * fx + grad4y[iabba] * fY +
						grad4z[iabba] * fZ + grad4w[iabba] * fw,
						grad4x[iabbb] * fX + grad4y[iabbb] * fY +
						grad4z[iabbb] * fZ + grad4w[iabbb] * fw,
					),
				),
			),
			lerp(t,
				lerp(s,
					lerp(r,
						grad4x[ibaaa] * fx + grad4y[ibaaa] * fy +
						grad4z[ibaaa] * fz + grad4w[ibaaa] * fW,
						grad4x[ibaab] * fX + grad4y[ibaab] * fy +
						grad4z[ibaab] * fz + grad4w[ibaab] * fW,
					),
					lerp(r,
						grad4x[ibaba] * fx + grad4y[ibaba] * fY +
						grad4z[ibaba] * fz + grad4w[ibaba] * fW,
						grad4x[ibabb] * fX + grad4y[ibabb] * fY +
						grad4z[ibabb] * fz + grad4w[ibabb] * fW,
					),
				),
				lerp(s,
					lerp(r,
						grad4x[ibbaa] * fx + grad4y[ibbaa] * fy +
						grad4z[ibbaa] * fZ + grad4w[ibbaa] * fW,
						grad4x[ibbab] * fX + grad4y[ibbab] * fy +
						grad4z[ibbab] * fZ + grad4w[ibbab] * fW,
					),
					lerp(r,
						grad4x[ibbba] * fx + grad4y[ibbba] * fY +
						grad4z[ibbba] * fZ + grad4w[ibbba] * fW,
						grad4x[ibbbb] * fX + grad4y[ibbbb] * fY +
						grad4z[ibbbb] * fZ + grad4w[ibbbb] * fW,
					),
				),
			),
		);
	}

	function fractal(noise)
	{
		return (o, ...p) => {
			let valsum = 0;
			let ampsum = 0;
			let scale = 1;
			let amp = 1;

			for(let i = 0; i < o; i ++) {
				valsum += noise(...p.map(x => x * scale)) * amp;
				ampsum += amp;
				scale *= 2;
				amp *= 0.5;
			}

			return valsum / ampsum;
		};
	}

	const fractal1d = fractal(sample1d);
	const fractal2d = fractal(sample2d);
	const fractal3d = fractal(sample3d);
	const fractal4d = fractal(sample4d);

	return {
		sample1d,  sample2d,  sample3d,  sample4d,
		fractal1d, fractal2d, fractal3d, fractal4d,
	};
}