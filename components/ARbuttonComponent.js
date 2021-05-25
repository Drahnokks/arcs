import ARCS from '../build/arcs.js';
import { ARButton } from '../deps/ARbutton.js';

var internalARbutton;


internalARbutton = ARCS.Component.create(
    function() {
    },
    ["load","unitize", "resize"], //slot
    ["onLoad"] //signaux
);
        
export default { OBJLoader: internalOBJLoader}; 
