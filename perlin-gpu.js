function xorshift32(x)
{
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	return x >>> 0;
}

export function gen_table(seed)
{
	let rand  = () => seed = xorshift32(seed);
	let table = new Uint8Array(1024 * 8);
	let perm  = table.subarray(1024 * 0);
	let grad1 = table.subarray(1024 * 1);
	let grad2 = table.subarray(1024 * 2);
	let grad3 = table.subarray(1024 * 3);
	let grad4 = table.subarray(1024 * 4);

	for(let i = 0; i < 1024 ; i += 4) {
		perm[i    ] = i >> 2;
		perm[i + 1] = i >> 2;
		perm[i + 2] = i >> 2;
		perm[i + 3] = i >> 2;

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
				let len1 = Math.sqrt(sqlen1);
				let len2 = Math.sqrt(sqlen2);
				let len3 = Math.sqrt(sqlen3);
				let len4 = Math.sqrt(sqlen4);
				grad1[i    ] = (gx / len1 + 1) * 127.5;
				grad2[i    ] = (gx / len2 + 1) * 127.5;
				grad2[i + 1] = (gy / len2 + 1) * 127.5;
				grad3[i    ] = (gx / len3 + 1) * 127.5;
				grad3[i + 1] = (gy / len3 + 1) * 127.5;
				grad3[i + 2] = (gz / len3 + 1) * 127.5;
				grad4[i    ] = (gx / len4 + 1) * 127.5;
				grad4[i + 1] = (gy / len4 + 1) * 127.5;
				grad4[i + 2] = (gz / len4 + 1) * 127.5;
				grad4[i + 3] = (gw / len4 + 1) * 127.5;
				break;
			}
		}
	}

	for(let i = 255; i > 0; i --) {
		for(let k = 0; k < 4; k ++) {
			let a = i * 4 + k;
			let b = rand() % i * 4 + k;
			let o = perm[a];
			perm[a] = perm[b];
			perm[b] = o;
		}
	}

	return table;
}

export function gen_table_tex(gl, seed)
{
	let table = gen_table(seed);
	let tex = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, 256, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, table
	);

	return tex;
}

export const glsl_code = `
	vec2 perm_uv(int i) {return vec2(i, 0) / vec2(256,8);}

	vec2 grad1_uv(int i) {return vec2(i, 1) / vec2(256,8);}
	vec2 grad2_uv(int i) {return vec2(i, 2) / vec2(256,8);}
	vec2 grad3_uv(int i) {return vec2(i, 3) / vec2(256,8);}
	vec2 grad4_uv(int i) {return vec2(i, 4) / vec2(256,8);}

	float smoother(float x) {return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);}
	vec2  smoother(vec2 x)  {return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);}
	vec3  smoother(vec3 x)  {return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);}
	vec4  smoother(vec4 x)  {return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);}

	int permx(sampler2D table, int i)
	{
		return int(texture(table, perm_uv(i)).x * 255.0);
	}

	int permy(sampler2D table, int i)
	{
		return int(texture(table, perm_uv(i)).y * 255.0);
	}

	int permz(sampler2D table, int i)
	{
		return int(texture(table, perm_uv(i)).z * 255.0);
	}

	int permw(sampler2D table, int i)
	{
		return int(texture(table, perm_uv(i)).w * 255.0);
	}

	float grad1(sampler2D table, int i)
	{
		return (texture(table, grad1_uv(i)).x * 2.0 - 1.0);
	}

	vec2 grad2(sampler2D table, int i)
	{
		return (texture(table, grad2_uv(i)).xy * 2.0 - 1.0);
	}

	vec3 grad3(sampler2D table, int i)
	{
		return (texture(table, grad3_uv(i)).xyz * 2.0 - 1.0);
	}

	vec4 grad4(sampler2D table, int i)
	{
		return (texture(table, grad4_uv(i)).xyzw * 2.0 - 1.0);
	}

	float perlin(sampler2D table, float v)
	{
		const float amp = 2.0;

		int i   = int(floor(v));
		float f = fract(v);
		float u = smoother(f);

		int ia = permx(table, i);
		int ib = permx(table, i + 1);

		return amp *
		    mix(grad1(table, ia) * (f - 0.0),
		        grad1(table, ib) * (f - 1.0),
		        u)
		;
	}

	float perlin(sampler2D table, vec2 v)
	{
		const float amp = 1.0 / sqrt(1.0 / 2.0);

		ivec2 i = ivec2(floor(v));
		vec2 f  = fract(v);
		vec2 u  = smoother(f);

		int ia    = permx(table, i.x    ) + i.y;
		int ib    = permx(table, i.x + 1) + i.y;
		int iaa   = permy(table, ia     );
		int iab   = permy(table, ib     );
		int iba   = permy(table, ia + 1 );
		int ibb   = permy(table, ib + 1 );

		return amp *
		    mix(mix(dot(grad2(table, iaa), f - vec2(0,0)),
		            dot(grad2(table, iab), f - vec2(1,0)),
		            u.x),
		        mix(dot(grad2(table, iba), f - vec2(0,1)),
		            dot(grad2(table, ibb), f - vec2(1,1)),
		            u.x),
		        u.y)
		;
	}

	float perlin(sampler2D table, vec3 v)
	{
		const float amp = 1.0 / sqrt(3.0 / 4.0);

		ivec3 i = ivec3(floor(v));
		vec3 f  = fract(v);
		vec3 u  = smoother(f);

		int ia    = permx(table, i.x    ) + i.y;
		int ib    = permx(table, i.x + 1) + i.y;
		int iaa   = permy(table, ia     ) + i.z;
		int iab   = permy(table, ib     ) + i.z;
		int iba   = permy(table, ia + 1 ) + i.z;
		int ibb   = permy(table, ib + 1 ) + i.z;
		int iaaa  = permz(table, iaa    );
		int iaab  = permz(table, iab    );
		int iaba  = permz(table, iba    );
		int iabb  = permz(table, ibb    );
		int ibaa  = permz(table, iaa + 1);
		int ibab  = permz(table, iab + 1);
		int ibba  = permz(table, iba + 1);
		int ibbb  = permz(table, ibb + 1);

		return amp *
		    mix(mix(mix(dot(grad3(table, iaaa), f - vec3(0,0,0)),
		                dot(grad3(table, iaab), f - vec3(1,0,0)),
		                u.x),
		            mix(dot(grad3(table, iaba), f - vec3(0,1,0)),
		                dot(grad3(table, iabb), f - vec3(1,1,0)),
		                u.x),
		            u.y),
		        mix(mix(dot(grad3(table, ibaa), f - vec3(0,0,1)),
		                dot(grad3(table, ibab), f - vec3(1,0,1)),
		                u.x),
		            mix(dot(grad3(table, ibba), f - vec3(0,1,1)),
		                dot(grad3(table, ibbb), f - vec3(1,1,1)),
		                u.x),
		            u.y),
		        u.z)
		;
	}

	float perlin(sampler2D table, vec4 v)
	{
		const float amp = 1.0;

		ivec4 i = ivec4(floor(v));
		vec4 f  = fract(v);
		vec4 u  = smoother(f);

		int ia    = permx(table, i.x    ) + i.y;
		int ib    = permx(table, i.x + 1) + i.y;
		int iaa   = permy(table, ia     ) + i.z;
		int iab   = permy(table, ib     ) + i.z;
		int iba   = permy(table, ia + 1 ) + i.z;
		int ibb   = permy(table, ib + 1 ) + i.z;
		int iaaa  = permz(table, iaa    ) + i.w;
		int iaab  = permz(table, iab    ) + i.w;
		int iaba  = permz(table, iba    ) + i.w;
		int iabb  = permz(table, ibb    ) + i.w;
		int ibaa  = permz(table, iaa + 1) + i.w;
		int ibab  = permz(table, iab + 1) + i.w;
		int ibba  = permz(table, iba + 1) + i.w;
		int ibbb  = permz(table, ibb + 1) + i.w;
		int iaaaa = permw(table, iaaa);
		int iaaab = permw(table, iaab);
		int iaaba = permw(table, iaba);
		int iaabb = permw(table, iabb);
		int iabaa = permw(table, ibaa);
		int iabab = permw(table, ibab);
		int iabba = permw(table, ibba);
		int iabbb = permw(table, ibbb);
		int ibaaa = permw(table, iaaa + 1);
		int ibaab = permw(table, iaab + 1);
		int ibaba = permw(table, iaba + 1);
		int ibabb = permw(table, iabb + 1);
		int ibbaa = permw(table, ibaa + 1);
		int ibbab = permw(table, ibab + 1);
		int ibbba = permw(table, ibba + 1);
		int ibbbb = permw(table, ibbb + 1);

		return amp *
		    mix(mix(mix(mix(dot(grad4(table, iaaaa), f - vec4(0,0,0,0)),
		                    dot(grad4(table, iaaab), f - vec4(1,0,0,0)),
		                    u.x),
		                mix(dot(grad4(table, iaaba), f - vec4(0,1,0,0)),
		                    dot(grad4(table, iaabb), f - vec4(1,1,0,0)),
		                    u.x),
		                u.y),
		            mix(mix(dot(grad4(table, iabaa), f - vec4(0,0,1,0)),
		                    dot(grad4(table, iabab), f - vec4(1,0,1,0)),
		                    u.x),
		                mix(dot(grad4(table, iabba), f - vec4(0,1,1,0)),
		                    dot(grad4(table, iabbb), f - vec4(1,1,1,0)),
		                    u.x),
		                u.y),
		            u.z),
		        mix(mix(mix(dot(grad4(table, ibaaa), f - vec4(0,0,0,1)),
		                    dot(grad4(table, ibaab), f - vec4(1,0,0,1)),
		                    u.x),
		                mix(dot(grad4(table, ibaba), f - vec4(0,1,0,1)),
		                    dot(grad4(table, ibabb), f - vec4(1,1,0,1)),
		                    u.x),
		                u.y),
		            mix(mix(dot(grad4(table, ibbaa), f - vec4(0,0,1,1)),
		                    dot(grad4(table, ibbab), f - vec4(1,0,1,1)),
		                    u.x),
		                mix(dot(grad4(table, ibbba), f - vec4(0,1,1,1)),
		                    dot(grad4(table, ibbbb), f - vec4(1,1,1,1)),
		                    u.x),
		                u.y),
		            u.z),
		        u.w)
		;
	}

	float fractal(sampler2D table, float p, int o)
	{
		float valsum = 0.0;
		float ampsum = 0.0;
		float scale = 1.0;
		float amp = 1.0;

		for(int i = 0; i < o; i ++) {
			valsum += perlin(table, p * scale) * amp;
			ampsum += amp;
			scale *= 2.0;
			amp *= 0.5;
		}

		return valsum / ampsum;
	}

	float fractal(sampler2D table, vec2 p, int o)
	{
		float valsum = 0.0;
		float ampsum = 0.0;
		float scale = 1.0;
		float amp = 1.0;

		for(int i = 0; i < o; i ++) {
			valsum += perlin(table, p * scale) * amp;
			ampsum += amp;
			scale *= 2.0;
			amp *= 0.5;
		}

		return valsum / ampsum;
	}

	float fractal(sampler2D table, vec3 p, int o)
	{
		float valsum = 0.0;
		float ampsum = 0.0;
		float scale = 1.0;
		float amp = 1.0;

		for(int i = 0; i < o; i ++) {
			valsum += perlin(table, p * scale) * amp;
			ampsum += amp;
			scale *= 2.0;
			amp *= 0.5;
		}

		return valsum / ampsum;
	}

	float fractal(sampler2D table, vec4 p, int o)
	{
		float valsum = 0.0;
		float ampsum = 0.0;
		float scale = 1.0;
		float amp = 1.0;

		for(int i = 0; i < o; i ++) {
			valsum += perlin(table, p * scale) * amp;
			ampsum += amp;
			scale *= 2.0;
			amp *= 0.5;
		}

		return valsum / ampsum;
	}
`;