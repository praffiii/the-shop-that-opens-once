// Draws exported pixel art in the 3D view, graded for the time of day (Core/Grade.cs) unless it is a light.
// The grade is ArtSource/kit.js's, on sRGB 0-255: out = in * mul + add + shade * (1 - luma). All zero globals leave
// the art as drawn. The textures are point filtered on import (Editor/PixelArtImport.cs), so pixels stay crisp.
// Art is cut out: a texel is there or not, and writes depth, so the ground, the standing cards and the ants hide each
// other by depth. A light (lit windows, lanterns, fireflies) is blended over the art instead, never graded, and
// bright enough to bloom. _Fade dithers a thing away while someone stands behind it.
// The world moves a little: a piece with a sway (Core/BakedArt.cs Pieces) bends in the wind, each texel row shifted
// by whole texels, more toward its top; and cloud shadows (_Clouds, set per time of day) drift over everything that
// is graded, their edges on the art pixel grid.
// The sun casts real shadows (Core/Grade.cs turns it for the time of day): everything that is cut out casts and
// receives them, looked up at the centre of each art pixel so their edges stay on the pixel grid too. A face turned
// from the sun (uv2.z, how far: Core/BakedArt.cs) is shadowed the same way.
// A room cut open in its area (_Room, Core/Place.cs) keeps its own light: what stands on its floor is not graded, nor
// clouded or sunlit (it has a roof), while the area round it is.
// After dark the lights glow on what is near them (_Lamps, Core/BakedArt.cs), in four steps. The characters (_Actor)
// catch a rim of sky light along their tops (_Rim) and each casts a small dark spot on what it stands on (_Feet,
// Core/Place.cs).
Shader "Shop/Pixel"
{
    Properties
    {
        [MainTexture] _MainTex ("Texture", 2D) = "white" {}
        [Toggle] _Light ("Light (never graded)", Float) = 0
        _Fade ("Opacity", Float) = 1
        [HideInInspector] _Src ("Blend from", Float) = 1
        [HideInInspector] _Dst ("Blend to", Float) = 0
        [HideInInspector] _ZWrite ("Depth write", Float) = 1
        [Toggle] _Actor ("Character (rim light, casts a spot)", Float) = 0
    }
    SubShader
    {
        Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        Cull Off

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

        TEXTURE2D(_MainTex);
        SAMPLER(sampler_MainTex);

        CBUFFER_START(UnityPerMaterial)
            float _Light;
            float _Fade;
            float _Src;
            float _Dst;
            float _ZWrite;
            float _Actor;
        CBUFFER_END

        float4 _GradeScale;      // mul - 1
        float4 _GradeAdd;
        float4 _GradeShade;
        float _Clouds;           // 0 (none) to 1 (full shadow)
        float4x4 _ArtFromWorld;  // world space to the place's art px (Core/Place.cs), and back
        float4x4 _WorldFromArt;
        float4 _ShadowTint;      // what the sun's shadow multiplies the art by (sRGB)
        float4 _Lamps[32];       // world position and reach of each light that glows on its surroundings
        float _LampCount;
        float4 _LampTint;        // the glow's colour (sRGB) and strength
        float4 _Room;            // the room's floor, x and row + height (art px): x0, y0, x1, y1; none when x1 <= x0
        float4 _Feet[16];       // world position under each character, and the spot's half width
        float _FeetCount;
        float4 _Rim;             // the rim light's colour (sRGB) and strength
        float _Sepia;            // 1 in a memory of 1952: everything washed to old-photograph brown

        float _Safelight;        // 1 in Theo's darkroom: everything black and red under the safelight
        float _Rain;             // 1 under rain cloud: the colours half drained, a little cooler

        // Greyed under rain by _Rain, washed toward sepia by _Sepia, and to the darkroom's black and red by _Safelight.
        float3 Sepia(float3 s)
        {
            float g = dot(s, float3(0.299, 0.587, 0.114));
            s = lerp(s, lerp(float3(g, g, g), s, 0.55) * float3(0.92, 0.97, 1.06), _Rain);
            s = lerp(s, dot(s, float3(0.299, 0.587, 0.114)) * float3(1.08, 0.9, 0.66) + float3(0.05, 0.03, 0), _Sepia);
            float l = dot(s, float3(0.299, 0.587, 0.114));
            return lerp(s, float3(l * 1.15, l * 0.25, l * 0.2), _Safelight * 0.9);
        }

        // rect: the piece's own texels in the atlas (u0, v top, u1, v bottom); sway: (amplitude in texels, phase,
        // how much darker this face is).
        struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; float4 rect : TEXCOORD1; float4 sway : TEXCOORD2; };
        struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float4 rect : TEXCOORD1; float4 sway : TEXCOORD2; float2 ground : TEXCOORD3; float3 art : TEXCOORD4; };

        Varyings vert(Attributes v)
        {
            Varyings o;
            o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
            o.uv = v.uv;
            o.rect = v.rect;
            o.sway = v.sway;
            // Where on the ground this is, in art px seen from above: clouds shade what stands under them.
            float3 art = mul(_ArtFromWorld, float4(TransformObjectToWorld(v.positionOS.xyz), 1)).xyz;
            o.ground = float2(art.x, -art.z);
            o.art = art;
            return o;
        }

        float Hash(float2 p)
        {
            p = frac(p * float2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return frac(p.x * p.y);
        }

        float Noise(float2 p)
        {
            float2 i = floor(p), f = frac(p);
            f = f * f * (3 - 2 * f);
            return lerp(lerp(Hash(i), Hash(i + float2(1, 0)), f.x), lerp(Hash(i + float2(0, 1)), Hash(i + 1), f.x), f.y);
        }

        // The texel this fragment shows, bent by the wind; alpha 0 where the bend leaves the piece.
        half4 Texel(Varyings i)
        {
            float2 uv = i.uv;
            if (i.sway.x > 0)
            {
                // Rows bend from a third of the way up, most at the top; two slow waves make the gusts uneven.
                // The atlas size comes from the texture itself: _TexelSize would keep the material off the SRP batcher.
                float cols, rows;
                _MainTex.GetDimensions(cols, rows);
                float row = floor(uv.y * rows) + 0.5;
                float top = i.rect.y * rows, bottom = i.rect.w * rows;
                float h = saturate((row - bottom) / max(1, top - bottom));
                float bend = pow(saturate((h - 0.3) / 0.7), 1.5);
                float wave = sin(_Time.y * 1.6 + i.sway.y) * 0.7 + sin(_Time.y * 0.55 + i.sway.y * 1.9) * 0.3;
                uv.x -= round(i.sway.x * bend * wave) / cols;
                if (uv.x < i.rect.x || uv.x > i.rect.z) return 0;
            }
            return SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);
        }

        // Cut-out art keeps a texel or drops it; a fading thing drops more of them in a 4x4 ordered dither.
        void Cut(Varyings i, half alpha)
        {
            if (_Light > 0.5) return;
            clip(alpha - 0.5);
            uint2 p = uint2(i.positionCS.xy) & 3;
            const float bayer[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
            clip(_Fade - (bayer[p.y * 4 + p.x] + 0.5) / 16);
        }
        ENDHLSL

        Pass
        {
            Blend [_Src] [_Dst]
            ZWrite [_ZWrite]

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE

            half4 frag(Varyings i) : SV_Target
            {
                half4 c = Texel(i);
                Cut(i, c.a);
                if (_Light > 0.5) return half4(SRGBToLinear(Sepia(LinearToSRGB(c.rgb))) * 2, c.a); // over 1, so the bloom picks lights out
                float3 s = LinearToSRGB(c.rgb);
                float shade = 1 - dot(s, float3(0.299, 0.587, 0.114));
                float2 floorAt = float2(i.art.x, -i.art.z);
                bool room = _Room.z > _Room.x && all(floorAt >= _Room.xy) && all(floorAt < _Room.zw);
                if (!room) s = saturate(s * (1 + _GradeScale.rgb) + (_GradeAdd.rgb + _GradeShade.rgb * shade) / 255);
                if (_Clouds > 0 && !room)
                {
                    float2 p = floor(i.ground) + _Time.y * float2(7, 2.5);
                    float n = Noise(p / 260) * 0.6 + Noise(p / 96) * 0.28 + Noise(p / 31) * 0.12;   // the fine octave curls the edges
                    s *= lerp(1, float3(0.8, 0.84, 0.94), step(0.6, n) * _Clouds);
                }
                float3 texel = mul(_WorldFromArt, float4(floor(i.art) + 0.5, 1)).xyz;
                float sun = room ? 1 : min(MainLightRealtimeShadow(TransformWorldToShadowCoord(texel)), 1 - i.sway.z);
                s *= lerp(_ShadowTint.rgb, 1, sun);
                if (_Actor > 0.5)
                {
                    // Lit along the top edge, where the texel above is clear.
                    float cols, rows;
                    _MainTex.GetDimensions(cols, rows);
                    s = lerp(s, _Rim.rgb, _Rim.a * step(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv + float2(0, 1 / rows)).a, 0.5));
                }
                else
                    for (int k = 0; k < _FeetCount; k++)
                    {
                        float3 d = (texel - _Feet[k].xyz) / _Feet[k].w;
                        s *= lerp(1, _ShadowTint.rgb, step(dot(d.xz * float2(1, 2.6), d.xz * float2(1, 2.6)), 1) * step(abs(d.y), 0.4) * 0.8);
                    }
                float glow = 0;
                for (int l = 0; l < _LampCount; l++) glow += saturate(1 - distance(texel, _Lamps[l].xyz) / _Lamps[l].w);
                glow = floor(saturate(glow) * 4) / 4 * _LampTint.a;
                s = s * (1 + _LampTint.rgb * glow * 0.8) + _LampTint.rgb * glow * 0.04;
                return half4(SRGBToLinear(saturate(Sepia(s))), 1);
            }
            ENDHLSL
        }

        // The sun's shadow map, cut out the same way; lights cast none.
        Pass
        {
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On
            ColorMask 0

            HLSLPROGRAM
            #pragma vertex caster
            #pragma fragment depth

            float3 _LightDirection;

            Varyings caster(Attributes v)
            {
                Varyings o = vert(v);
                float3 world = TransformObjectToWorld(v.positionOS.xyz) + _LightDirection * _ShadowBias.x;
                o.positionCS = ApplyShadowClamping(TransformWorldToHClip(world));
                return o;
            }

            half depth(Varyings i) : SV_Target
            {
                if (_Light > 0.5) discard;
                Cut(i, Texel(i).a);
                return 0;
            }
            ENDHLSL
        }

        // Depth for the depth of field, cut out the same way.
        Pass
        {
            Tags { "LightMode" = "DepthOnly" }
            ZWrite On
            ColorMask R

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment depth

            half depth(Varyings i) : SV_Target
            {
                if (_Light > 0.5) discard;
                Cut(i, Texel(i).a);
                return 0;
            }
            ENDHLSL
        }
    }
}
