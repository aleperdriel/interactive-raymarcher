#version 300 es

in vec2 a_position;
in vec2 a_uv;

out vec2 f_uv;

void main() {
    gl_Position = vec4(a_position, 0, 1);
    f_uv = a_uv;
}