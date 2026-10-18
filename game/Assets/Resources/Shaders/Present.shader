// Lays the screen canvas (the UI, drawn by Main's UI camera onto a clear canvas) over the world. The UI shaders leave
// the canvas premultiplied by its alpha, so it is laid on as it is: a half-faded curtain covers half the world.
Shader "Shop/Present"
{
    Properties
    {
        [PerRendererData] _MainTex ("Canvas", 2D) = "black" {}
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
        Blend One OneMinusSrcAlpha
        ZWrite Off
        ZTest Always
        Cull Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex;

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.positionCS = UnityObjectToClipPos(v.positionOS);
                o.uv = v.uv;
                return o;
            }

            fixed4 frag(Varyings i) : SV_Target { return tex2D(_MainTex, i.uv); }
            ENDHLSL
        }
    }
}
