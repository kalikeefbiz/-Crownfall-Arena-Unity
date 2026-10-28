"""Matched diagnostic renders; changes in-memory only, never saves the input file."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[1]
def render(out,views=None):
    s=bpy.context.scene
    s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=16;s.cycles.use_denoising=False
    s.render.resolution_x=960;s.render.resolution_y=720;s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG';s.render.film_transparent=False
    s.world=bpy.data.worlds.new('Audit_World');s.world.use_nodes=True
    s.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(0.17,0.19,0.23,1)
    s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=0.6
    s.view_settings.view_transform='AgX'
    def light(name,pos,power,size):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
    light('Audit_Key',(1,-1,2.5),125,3);light('Audit_Fill',(-2,1,1.6),60,3)
    d=bpy.data.cameras.new('Audit_Camera');c=bpy.data.objects.new('Audit_Camera',d);s.collection.objects.link(c);s.camera=c;d.clip_start=0.001;d.clip_end=100
    configs=views or [dict(name='entire-arena',position=[2.0,-2.4,2.6],target=[0,0,0],ortho=2.8),dict(name='top-plan',position=[0,0,3],target=[0,0,0],ortho=2.6)]
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    for v in configs:
        c.location=v['position'];c.rotation_euler=(Vector(v['target'])-c.location).to_track_quat('-Z','Y').to_euler()
        d.type='ORTHO' if 'ortho' in v else 'PERSP'
        if 'ortho' in v:d.ortho_scale=v['ortho']
        else:
            d.sensor_fit='VERTICAL';d.lens=d.sensor_height/(2*math.tan(math.radians(v.get('vertical_fov_degrees',48))/2))
        s.render.filepath=str(out/(v['name']+'.png'));bpy.ops.render.render(write_still=True)
    (out/'cameras.json').write_text(json.dumps(configs,indent=2))
if __name__=='__main__':
    a=sys.argv[sys.argv.index('--')+1:];render(a[0],json.loads(Path(a[1]).read_text()) if len(a)>1 else None)
