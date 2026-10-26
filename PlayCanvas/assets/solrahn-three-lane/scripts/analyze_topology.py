"""Requires system NumPy/SciPy. No model edits."""
import numpy as np,json,sys
from pathlib import Path
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
root=Path(sys.argv[1]);p=np.load(root/'working/source-topology/positions.npy',mmap_mode='r');e=np.load(root/'working/source-topology/edges.npy',mmap_mode='r');f=np.load(root/'working/source-topology/faces.npy',mmap_mode='r')
g=coo_matrix((np.ones(len(e),dtype=np.int8),(e[:,0],e[:,1])),shape=(len(p),len(p))).tocsr();n,labels=connected_components(g,directed=False);del g
sizes=np.bincount(labels);order=np.argsort(sizes)[::-1];top=[]
for label in order[:25]:
 pts=p[labels==label];top.append(dict(label=int(label),vertices=int(sizes[label]),min=pts.min(0).tolist(),max=pts.max(0).tolist()))
# Coincident positions alone are not safe welds: UV seams / overlapping surfaces may be intentional.
u,counts=np.unique(p,axis=0,return_counts=True)
r=dict(components=int(n),largest_components=top,component_vertices_percentiles=np.percentile(sizes,[0,25,50,75,90,99,100]).tolist(),coincident_position_excess=int((counts-1).sum()),note='No components or coincident positions removed. Connected shells are not semantically labeled objects.')
(root/'manifests/topology.json').write_text(json.dumps(r,indent=2));np.save(root/'working/source-topology/component-labels.npy',labels);print(json.dumps(r,indent=2))
