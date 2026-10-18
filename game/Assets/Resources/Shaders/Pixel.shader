// Draws exported pixel art in the 3D view, graded for the time of day (Core/Grade.cs) unless it is a light.
// The grade is ArtSource/kit.js's, on sRGB 0-255: out = in * mul + add + shade * (1 - luma). All zero globals leave
// the art as drawn. The textures are point filtered on import (Editor/PixelArtImport.cs), so pixels stay crisp.
// Art is cut out: a texel is there or not, and writes depth, so the ground, the standing cards and the ants hide each
// other by depth. A light (lit windows, lanterns, fireflies) is blended over the art instead, never graded, and
// bright enough to bloom. _Fade dithers a thing away while someone stands behind it.
// The world moves a little: a piece with a sway (Core/BakedArt.cs Pieces) bends in the wind, each texel row shifted
// by whole texels, more toward its top; and cloud shadows (_Clouds, set per time of day) drift over everything that
// is graded, their edges on the art pixel grid.
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
    }
    SubShader
    {
        Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        Cull Off

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"

        TEXTURE2D(_MainTex);
        SAMPLER(sampler_MainTex);

        CBUFFER_START(UnityPerMaterial)
            float _Light;
            float _Fade;
            float _Src;
            float _Dst;
            float _ZWrite;
        CBUFFER_END

        float4 _GradeScale;      // mul - 1
        float4 _GradeAdd;
        float4 _GradeShade;
        float _Clouds;           // 0 (none) to 1 (full shadow)
        float4x4 _ArtFromWorld;  // world space to the place's art px (Core/Place.cs)

        // rect: the piece's own texels in the atlas (u0, v top, u1, v bottom); sway: (amplitude in texels, phase).
        struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; float4 rect : TEXCOORD1; float2 sway : TEXCOORD2; };
        struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float4 rect : TEXCOORD1; float2 sway : TEXCOORD2; float2 ground : TEXCOORD3; };

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

            half4 frag(Varyings i) : SV_Target
            {
                half4 c = Texel(i);
                Cut(i, c.a);
                if (_Light > 0.5) return half4(c.rgb * 2, c.a); // over 1, so the bloom picks lights out
                float3 s = LinearToSRGB(c.rgb);
                float shade = 1 - dot(s, float3(0.299, 0.587, 0.114));
                s = saturate(s * (1 + _GradeScale.rgb) + (_GradeAdd.rgb + _GradeShade.rgb * shade) / 255);
                if (_Clouds > 0)
                {
                    float2 p = floor(i.ground) + _Time.y * float2(7, 2.5);
                    float n = Noise(p / 260) * 0.6 + Noise(p / 96) * 0.28 + Noise(p / 31) * 0.12;   // the fine octave curls the edges
                    s *= lerp(1, float3(0.8, 0.84, 0.94), step(0.6, n) * _Clouds);
                }
                return half4(SRGBToLinear(s), 1);
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
