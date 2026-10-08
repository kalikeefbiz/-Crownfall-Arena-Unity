"""Production asset/presentation contract. Does not execute Unity native APIs."""
from pathlib import Path
import hashlib, json, re, subprocess, struct
import yaml
from validate_current_build import documents, guid_for, require

ROOT=Path(__file__).resolve().parents[1]

def main():
    mapping=json.loads((ROOT/'Docs/PRODUCTION_ASSET_MAP.json').read_text())['assets']
    transfer=json.loads((ROOT/'ProductionArtStaging/Crownfall/TRANSFER_MAP.json').read_text())
    for row in transfer['files']:
        data=(ROOT/row['target_path']).read_bytes()
        require(len(data)==row['size_bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'], 'Transfer mismatch')
        require(hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==row['git_blob_sha1'],'Git blob mismatch')
    runtime={row['runtime']:row for row in mapping}
    for row in mapping:
        source=ROOT/row['staging'];target=ROOT/row['runtime']
        require(source.read_bytes()==target.read_bytes(),'Changed source image bytes: '+str(target))
        require(hashlib.sha256(target.read_bytes()).hexdigest()==row['sha256'],'Runtime hash')
        meta=documents(row['runtime']+'.meta')[0]['TextureImporter']
        web=next(p for p in meta['platformSettings'] if p['buildTarget']=='WebGL')
        require(web['overridden']==1 and web['maxTextureSize']==row['maxSize'] and web['textureFormat']==4,'WebGL importer policy')
        require(meta['isReadable']==0 and meta['mipmaps']['enableMipMap']==0 and meta['nPOTScale']==0,'Residency policy')
    all_png=[p for p in (ROOT/'Assets/Art').rglob('*') if p.suffix.lower()=='.png']
    hashes={};resident=0
    for path in all_png:
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        require(digest not in hashes,'Redundant runtime PNG: '+str(path));hashes[digest]=path
        meta=documents(path.relative_to(ROOT).as_posix()+'.meta')[0]['TextureImporter']
        web=next(p for p in meta['platformSettings'] if p['buildTarget']=='WebGL')
        w,h=struct.unpack('>II',path.read_bytes()[16:24]);scale=min(1,web['maxTextureSize']/max(w,h))
        resident+=round(w*scale)*round(h*scale)*4
    require(resident<90*1024*1024,'Texture budget exceeds 90 MiB')
    asset=documents('Assets/Crownfall/Configuration/ProductionArt.asset')[0]['MonoBehaviour']
    lookup={row['staging'].split('Crownfall/',1)[1]:row['runtime'] for row in mapping}
    expected={
        'kit':{'idle':'Kit/Idle','run':'Kit/Run','sideRun':'Kit/Side-Run','basicSide':'Kit/Side-Basic','basicBack':'Kit/Back-Basic'},
        'set':{'basicFront':'Set/Basic','run':'Set/Run','action':'Set/WarCry','ultimate':'Set/PanthersFist'},
        'riven':{'idle':'Riven/Idle','run':'Riven/Run','ultimate':'Riven/Scream'},
    }
    for roster,groups in expected.items():
        for field,prefix in groups.items():
            paths=[lookup[k] for k in sorted(lookup) if k.startswith(prefix+'/')]
            require([v['guid'] for v in asset[roster][field]]==[guid_for(p) for p in paths],'Animation sequence order: '+prefix)
    require(len(asset['set']['action'])==3,'Preserve authored WarCry 000/002/003; do not invent missing 001')
    require(lookup['UI/Menus Art.PNG']==lookup['Environment/Arena.PNG'],'Menu/arena reuse')
    scene=documents('Assets/Scenes/CrownfallMatch.unity')[2]['MonoBehaviour']
    require(scene['productionArt']['guid']==guid_for('Assets/Crownfall/Configuration/ProductionArt.asset'),'Catalog not bound')
    refs=re.findall(r'guid: ([a-f0-9]{32})',(ROOT/'Assets/Crownfall/Configuration/ProductionArt.asset').read_text())
    require(all(guid_for(path) in refs for path in runtime),'Runtime art not referenced by catalog')
    for path in ROOT.rglob('*.json'):
        if '.git' not in path.parts:json.loads(path.read_text())
    for path in (ROOT/'.github/workflows').glob('*.yml'):yaml.safe_load(path.read_text())
    for path in (ROOT/'Assets').rglob('*'):
        if path.suffix in ('.asset','.unity','.mat','.meta'):documents(path.relative_to(ROOT).as_posix())
    for path in (ROOT/'ci').glob('*.sh'):subprocess.run(['bash','-n',str(path)],check=True)
    for name in ('ArenaPresentation','ActorPresentationController','ProductionVfx'):
        code=(ROOT/f'Assets/Crownfall/Match/Runtime/{name}.cs').read_text()
        require(not any(word in code for word in ('AddComponent<Collider','AddComponent<BoxCollider','CreatePrimitive','CharacterController','Health.Receive','DamageRequest')),'Decoration/presentation authority: '+name)
    vfx=(ROOT/'Assets/Crownfall/Match/Runtime/ProductionVfx.cs').read_text()
    reset=vfx.split('public void Reset()',1)[1].split('readonly Visual[]',1)[0]
    for token in ('Key=null','OwnerId=0','ActionId=0','Until=0','localPosition=Vector3.zero','localRotation=Quaternion.identity','localScale=Vector3.one','Sprite.sprite=null','Sprite.color=Color.white','Line.positionCount=0','Root.SetActive(false)'):
        require(token in reset,'Pool reset missing '+token)
    require('Instantiate(' not in vfx and 'Destroy(' not in vfx,'VFX churn')
    touch=(ROOT/'Assets/Crownfall/Match/Runtime/MatchTouchInput.cs').read_text()
    require('TouchPhase.Canceled' in touch and 'state.CancelMissing' in touch and 'if(pauseRect.Contains(position)){Reset(p);return;}' in touch,'Touch lifecycle gate')
    ui=(ROOT/'Assets/Crownfall/Match/Runtime/MatchProductionUi.cs').read_text()
    require('new CastCommand' not in ui and 'match.Cast(' not in ui,'Duplicate UI input authority')
    bootstrap=(ROOT/'Assets/Crownfall/Match/Runtime/CrownfallMatchBootstrap.cs').read_text()
    require('collider.enabled=false;Destroy(collider)' in bootstrap,'Immediate decorative collider disable')
    require('vfx.Reset()' in bootstrap and 'arenaPresentation.Dispose()' in bootstrap and 'audioDirector.ResetMatch()' in bootstrap and 'tints.Clear()' in bootstrap,'Rematch cleanup')
    template=(ROOT/'Assets/WebGLTemplates/PipelineTest/index.html').read_text()
    for token in ('visibilitychange','pagehide','touchcancel','orientationchange','visualViewport','SetBrowserInsets','SuspendBrowserInput'):
        require(token in template,'Browser lifecycle missing '+token)
    require('canvas{height:56.25vw}' not in template,'Portrait viewport corruption')
    # Memory measurements assume conservative uncompressed RGBA32 residency.
    print(f'PASS: {len(transfer["files"])} transfer files, {len(mapping)} staging mappings, {len(runtime)} unique mapped textures, {len(all_png)} runtime textures, {resident/1048576:.2f} MiB RGBA32 residency; all catalog frames ordered and source bytes preserved.')
    print('PASS: JSON/YAML, GUID-linked catalog, shell syntax, presentation authority, bounded pool reset, touch lifecycle, safe-area/browser wiring and rematch cleanup guards.')

if __name__=='__main__':main()
