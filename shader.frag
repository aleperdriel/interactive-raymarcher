#version 300 es
precision highp float;

#define EPS         0.001
#define N_MAX_STEPS 80
#define MAX_DIST    100.0

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec2 u_mouseRot;
uniform float u_time;
uniform float u_dt;
vec3 movement = vec3(.0);
in vec2 f_uv;

out vec4 outColor;
vec3 diffColor = vec3(1.0, 1.0, 1.0);

float smin(float a, float b, float k) {
    k *= log(2.0);
    float x = b - a;
    return a + x / (1.0 - exp2(x / k));
}

float sdp_cube(vec3 p, float r) {
    vec3 d = abs(p) - vec3(r);
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sdp_sphere(vec3 p, float r) {
    return length(p)- r;
}


float sdp_plane(vec3 p, float r) {
    return p.y - (-r);
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

mat3 rotationX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        1.0, 0.0, 0.0,
         0.0,c, -s,
       0.0, s, c
    );
}

mat3 rotationY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, -s, 0.0,
        s, c, 0.0,
       0.0, 0.0, 1.0
    );
}

mat3 rotationZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
       -s, 0.0, c
    );
}

vec4 sdf_scene(vec3 p) {
    vec3 sp1 = vec3(4.5, 0.0, 0.0);
    float sd1 = sdp_cube(p - sp1, 1.0);
    vec3 cube1Color = vec3(0.0, 0.5, 0.5);
    

    vec3 sp2 = vec3(1.0, 0.0, 0.0);
    float sd2 = sdp_cube(p - sp2, 1.0);
    vec3 cube2Color = vec3(0.5, 0.5, 0.0);


    mat3 rotation = rotationZ(radians(90.0)) * rotationY(0.4);
    vec3 rotationP = rotation * p;

    vec3 sdp =  vec3(0.0, 0.5, 0.0);
    float sdplane = sdp_plane(p - sdp, 10.0);
    vec3 planeColor = vec3(0.5, 0.0, 0.5);

    float minDist = sd1;
    vec3 objColor = cube1Color;

    if (sd2 < minDist) {
        minDist = sd2;
        objColor = cube2Color;
    }
    
    if (sdplane < minDist) {
        minDist = sdplane;
        objColor = planeColor;
    }

    return vec4(minDist, objColor);
}

float ray_march(vec3 ro, vec3 rd, inout vec3 diffColor) {
    float t = 0.0;
    for (int i = 0; i < N_MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec4 d = sdf_scene(p);
        float d0 = d.x;
        t += d0;
        diffColor = d.yzw;
        if (d0 < EPS || t > MAX_DIST) break;
    }
    return t;
}


vec3 approx_normal(vec3 p) {
    vec2 eps = vec2(EPS, -EPS);
    return normalize(
        eps.xyy * sdf_scene(p + eps.xyy).x + \
        eps.yyx * sdf_scene(p + eps.yyx).x + \
        eps.yxy * sdf_scene(p + eps.yxy).x + \
        eps.xxx * sdf_scene(p + eps.xxx).x
    );
}



void main() {
    vec2 uv = (f_uv * 2.0 - 1.0) * u_resolution / u_resolution.y;

    vec3 ro = vec3(0.0, 0.0, -4.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    vec3 origin = vec3(0.0); 
    vec3 forward = normalize(ro - origin);  
    
    vec3 rotatedForward = rotationZ(-u_mouseRot.x) * forward;
    vec3 right = cross(vec3(0.0, 1.0, 0.0), rotatedForward);
    vec3 up = cross(right, rotatedForward);

    vec3 a_col = vec3(145.0 / 255.0, 155.0 / 255.0, 250.0 / 255.0);
    vec3 col = a_col;

    vec3 l_dir = normalize(vec3(sin(u_time) * 1.5, 0.5, 1.0));
    vec3 l_col = vec3(0.8, 0.5, 0.1);

    vec2 mousePos = u_mouse.xy/u_resolution.xy;

    rd *= rotationX(u_mouseRot.y) * rotationZ(u_mouseRot.x);
    ro += -mousePos.x * right;
    ro += -mousePos.y * up;

    float t = ray_march(ro, rd, diffColor);
    if (t <= MAX_DIST) {
        vec3 p = ro + rd * t;

        vec3 n = approx_normal(p);
        vec3 diff = vec3(max(0.0, dot(l_dir, n))) * l_col;
        diff += diffColor;

        float k = max(0.0, dot(n, -rd));
        vec3 ref = vec3(pow(k, 4.0)) * 1.0 * l_col;

        col = mix(diff + ref, a_col, 0.1);
    }

    col = pow(col, vec3(0.4545));
    outColor = vec4(col, 1.0);
}
