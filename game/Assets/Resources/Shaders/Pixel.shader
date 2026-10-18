// Draws exported pixel art, alpha blended, graded for the time of day (Core/Grade.cs) unless it is a light.
// The grade is ArtSource/kit.js's, on sRGB 0-255: out = in * mul + add + shade * (1 - luma). All zero globals leave
// the art as drawn. _Fade makes a thing see-through while someone stands behind it. The textures are point filtered on import (Editor/PixelArtImport.cs), so pixels stay crisp.
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
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            CBUFFER_START(UnityPerMaterial)
                float _Light;
                float _Fade;
            CBUFFER_END

            float4 _GradeScale; // mul - 1
            float4 _GradeAdd;
            float4 _GradeShade;
            float _Clouds;      // 0 (none) to 1 (full shadow)

            // rect: the piece's own texels in the atlas (u0, v top, u1, v bottom); sway: (amplitude in texels, phase).
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; float4 rect : TEXCOORD1; float2 sway : TEXCOORD2; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float4 rect : TEXCOORD1; float2 sway : TEXCOORD2; float2 world : TEXCOORD3; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv;
                o.rect = v.rect;
                o.sway = v.sway;
                o.world = TransformObjectToWorld(v.positionOS.xyz).xy;
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

            half4 frag(Varyings i) : SV_Target
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
                    if (uv.x < i.rect.x || uv.x > i.rect.z) discard;
                }
                half4 c = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);
                c.a *= _Fade;
                if (_Light > 0.5) return c;
                float3 s = LinearToSRGB(c.rgb);
                float shade = 1 - dot(s, float3(0.299, 0.587, 0.114));
                s = saturate(s * (1 + _GradeScale.rgb) + (_GradeAdd.rgb + _GradeShade.rgb * shade) / 255);
                if (_Clouds > 0)
                {
                    float2 p = floor(i.world) + _Time.y * float2(7, 2.5);
                    float n = Noise(p / 260) * 0.6 + Noise(p / 96) * 0.28 + Noise(p / 31) * 0.12;   // the fine octave curls the edges
                    s *= lerp(1, float3(0.8, 0.84, 0.94), step(0.6, n) * _Clouds);
                }
                c.rgb = SRGBToLinear(s);
                return c;
            }
            ENDHLSL
        }
    }
}
