// Draws exported pixel art, alpha blended, graded for the time of day (Core/Grade.cs) unless it is a light.
// The grade is ArtSource/kit.js's, on sRGB 0-255: out = in * mul + add + shade * (1 - luma). All zero globals leave
// the art as drawn. The textures are point filtered on import (Editor/PixelArtImport.cs), so pixels stay crisp.
Shader "Shop/Pixel"
{
    Properties
    {
        [MainTexture] _MainTex ("Texture", 2D) = "white" {}
        [Toggle] _Light ("Light (never graded)", Float) = 0
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
                float4 _MainTex_ST;
                float _Light;
            CBUFFER_END

            float4 _GradeScale; // mul - 1
            float4 _GradeAdd;
            float4 _GradeShade;

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv;
                return o;
            }

            half4 frag(Varyings i) : SV_Target
            {
                half4 c = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv);
                if (_Light > 0.5) return c;
                float3 s = LinearToSRGB(c.rgb);
                float shade = 1 - dot(s, float3(0.299, 0.587, 0.114));
                c.rgb = SRGBToLinear(saturate(s * (1 + _GradeScale.rgb) + (_GradeAdd.rgb + _GradeShade.rgb * shade) / 255));
                return c;
            }
            ENDHLSL
        }
    }
}
