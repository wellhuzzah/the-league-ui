import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import client from '../api/client'
import Scene from '../components/Scene'
import TopNav from '../components/TopNav'
import TowerFX from '../components/towerFx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const QUESTION_COUNT = 10
const MAX_POINTS_PER_Q = 100
const TIMER_DURATION = 15       // seconds per question (score-decay window)
const READING_GRACE = 15        // seconds of full-bar reading time before decay starts
const REVEAL_DELAY = 1800       // ms before advancing after answer

// ---------------------------------------------------------------------------
// TowerSprite — pixel-art Rockwood water tower (Claude Design)
// Ported from IIFE to ESM. Props: rung 0-10, shake bool, beacon bool, scale int
// ---------------------------------------------------------------------------

const W = 96, H = 160
const C = {
	steelHi:'#D2D8E0',steelMid:'#9098A4',steelLo:'#5A6470',steelShade:'#384048',
	seam:'#2A3038',letter:'#1A1F26',rivetHi:'#E0E5EC',
	amber:'#F5B83A',amberHi:'#FFE08A',amberLo:'#7A5818',
	rust:'#9C5D2E',skin:'#F0C5A0',pants:'#3F5B85',shirt:'#C26A3A',
	red:'#E94B3C',redHot:'#FF8868',beaconHi:'#FFEAA6',beaconLo:'#FFBA3D',
	bg:'#0E1525',star:'#E8ECF2',starDim:'#5A6480',ground:'#1C2436',groundHi:'#283250',
}
const LETTERS = {
	R:['11110','10001','10001','10001','11110','10100','10010'],
	O:['01110','10001','10001','10001','10001','10001','01110'],
	C:['01111','10000','10000','10000','10000','10000','01111'],
	K:['10001','10010','10100','11000','10100','10010','10001'],
	W:['10001','10001','10001','10101','11011','11011','10001'],
	D:['11110','10001','10001','10001','10001','10001','11110'],
}
function makeGrid() {
	const g = new Array(H)
	for (let y=0;y<H;y++) g[y]=new Array(W).fill(null)
	return g
}
function put(g,x,y,c){if(x>=0&&x<W&&y>=0&&y<H)g[y][x]=c}
function rectFill(g,x,y,w,h,c){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(g,x+dx,y+dy,c)}
function lineH(g,x,y,len,c){rectFill(g,x,y,len,1,c)}
function lineV(g,x,y,len,c){rectFill(g,x,y,1,len,c)}
function diag(g,x0,y0,x1,y1,c){
	const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0)
	const sx=x0<x1?1:-1,sy=y0<y1?1:-1
	let err=dx-dy,x=x0,y=y0
	while(true){
		put(g,x,y,c)
		if(x===x1&&y===y1)break
		const e2=2*err
		if(e2>-dy){err-=dy;x+=sx}
		if(e2<dx){err+=dx;y+=sy}
	}
}
const TANK_CX=48,TANK_TOP_Y=10,TANK_DOME_END=18,TANK_CYL_END=44,TANK_BOT_Y=52,TANK_EQ_Y=30,TANK_RX=26
function tankHalfAt(y){
	if(y<TANK_TOP_Y||y>TANK_BOT_Y)return 0
	if(y>=TANK_DOME_END&&y<=TANK_CYL_END)return TANK_RX
	if(y<TANK_DOME_END){
		const ry=TANK_DOME_END-TANK_TOP_Y,dy=TANK_DOME_END-y,t=(dy*dy)/(ry*ry)
		if(t>1)return 0;return TANK_RX*Math.sqrt(1-t)
	}
	const ry=TANK_BOT_Y-TANK_CYL_END,dy=y-TANK_CYL_END,t=(dy*dy)/(ry*ry)
	if(t>1)return 0;return TANK_RX*Math.sqrt(1-t)
}
function fillTank(g){
	const cx=TANK_CX
	for(let y=TANK_TOP_Y;y<=TANK_BOT_Y;y++){
		const half=Math.round(tankHalfAt(y));if(half<=0)continue
		for(let x=cx-half;x<cx+half;x++)put(g,x,y,C.steelMid)
	}
	for(let y=TANK_TOP_Y;y<=TANK_BOT_Y;y++){
		const row=g[y];let left=-1,right=-1
		for(let x=0;x<W;x++){if(row[x]===C.steelMid){if(left<0)left=x;right=x}}
		if(left<0)continue
		put(g,left,y,C.steelLo);put(g,right,y,C.steelLo)
	}
	for(let y=TANK_DOME_END;y<=TANK_CYL_END;y++){
		const row=g[y],leftIn=cx-TANK_RX+1,rightIn=cx+TANK_RX-2
		if(row[leftIn]===C.steelMid)put(g,leftIn,y,C.steelHi)
		if(row[leftIn+1]===C.steelMid)put(g,leftIn+1,y,C.steelHi)
		if(row[rightIn]===C.steelMid)put(g,rightIn,y,C.steelLo)
	}
	for(let a=195;a>=160;a-=4){
		const rad=a*Math.PI/180
		const x=Math.round(cx+(TANK_RX-4)*Math.cos(rad))
		const y=Math.round(TANK_DOME_END+(TANK_DOME_END-TANK_TOP_Y)*Math.sin(rad))
		if(y>=TANK_TOP_Y&&y<=TANK_DOME_END&&g[y]&&g[y][x]===C.steelMid)put(g,x,y,C.steelHi)
	}
	for(const seamY of[TANK_DOME_END,TANK_CYL_END]){
		const half=TANK_RX-2
		for(let x=cx-half;x<=cx+half;x++)if(g[seamY][x]===C.steelMid)put(g,x,seamY,C.steelLo)
	}
}
function drawFinial(g){
	const cx=TANK_CX
	lineV(g,cx,0,3,C.steelHi)
	rectFill(g,cx-1,3,3,2,C.beaconLo)
	rectFill(g,cx-3,5,7,1,C.steelHi)
	rectFill(g,cx-3,6,7,1,C.steelMid)
	rectFill(g,cx-3,7,7,1,C.steelLo)
	rectFill(g,cx-1,8,3,2,C.steelMid)
	put(g,cx-1,8,C.steelHi)
}
function drawLabel(g){
	const word='ROCKWOOD',lh=7,lw=5,gap=1
	const total=word.length*lw+(word.length-1)*gap
	const x0=TANK_CX-Math.floor(total/2),y0=TANK_EQ_Y-3
	for(let i=0;i<word.length;i++){
		const glyph=LETTERS[word[i]],lx=x0+i*(lw+gap)
		for(let ry=0;ry<lh;ry++){
			const row=glyph[ry]
			for(let rx=0;rx<lw;rx++)if(row[rx]==='1')put(g,lx+rx,y0+ry,C.letter)
		}
	}
}
const CATWALK_Y=TANK_CYL_END,CATWALK_HALF=28,RAIL_TOP_Y=TANK_CYL_END-5
function drawCatwalk(g){
	const cx=TANK_CX,platY=CATWALK_Y,platHalf=CATWALK_HALF,railTop=RAIL_TOP_Y,railBot=platY
	const posts=[-28,-20,-12,-4,4,12,20,28]
	for(const p of posts)lineV(g,cx+p,railTop,railBot-railTop,C.steelLo)
	lineH(g,cx-platHalf,railTop,platHalf*2+1,C.steelShade)
	for(let i=0;i<posts.length-1;i++){
		const xL=cx+posts[i],xR=cx+posts[i+1]
		diag(g,xL+1,railTop+1,xR-1,railBot-1,C.steelLo)
		diag(g,xR-1,railTop+1,xL+1,railBot-1,C.steelLo)
	}
	lineH(g,cx-platHalf-1,platY,platHalf*2+2,C.steelHi)
	lineH(g,cx-platHalf-1,platY+1,platHalf*2+2,C.steelLo)
}
const LEG_TOP_Y=CATWALK_Y,LEG_BOT_Y=146,LEG_X={'-2':20,'-1':38,'1':58,'2':76}
function drawLegs(g){
	for(const side of[-2,-1,1,2]){
		for(let y=LEG_TOP_Y;y<=LEG_BOT_Y;y++){
			const x=LEG_X[side];put(g,x,y,C.steelMid)
			if(side===-2)put(g,x+1,y,C.steelLo)
			if(side===2)put(g,x-1,y,C.steelLo)
		}
	}
}
function drawBraces(g){
	const belts=[[54,78],[82,108],[114,138]]
	for(const[yT,yB]of belts){
		for(const pair of[[-2,-1],[-1,1],[1,2]]){
			const[a,b]=pair
			diag(g,LEG_X[a],yT,LEG_X[b],yB,C.steelLo)
			diag(g,LEG_X[b],yT,LEG_X[a],yB,C.steelLo)
		}
		for(const yy of[yT,yB])lineH(g,LEG_X[-2]+1,yy,LEG_X[2]-LEG_X[-2]-1,C.steelShade)
	}
}
function drawLadder(g,rung){
	const ladX=12,railW=5,yBot=LEG_BOT_Y-4,yTop=CATWALK_Y+1,rungs=10,span=yBot-yTop
	for(let y=yTop;y<=yBot;y++){put(g,ladX,y,C.steelLo);put(g,ladX+railW,y,C.steelLo)}
	for(let i=0;i<rungs;i++){
		const y=yBot-Math.round((i+0.5)*span/rungs)
		const lit=i<rung
		lineH(g,ladX+1,y,railW-1,lit?C.amber:C.steelLo)
		lineH(g,ladX+1,y-1,railW-1,lit?C.amberHi:C.steelMid)
	}
	return{ladX,yTop,yBot,rungs,railW}
}
function drawClimber(g,lad,rung){
	if(rung<=0||rung>10)return
	const i=rung-1,span=lad.yBot-lad.yTop
	const yRung=lad.yBot-Math.round((i+0.5)*span/10)
	const cx=lad.ladX+Math.floor(lad.railW/2)+1,yFeet=yRung-1
	put(g,cx-1,yFeet,C.pants);put(g,cx,yFeet,C.pants)
	put(g,cx-1,yFeet-1,C.pants);put(g,cx,yFeet-1,C.pants)
	rectFill(g,cx-1,yFeet-4,3,2,C.shirt)
	put(g,cx-2,yFeet-3,C.skin);put(g,cx+2,yFeet-3,C.skin)
	rectFill(g,cx-1,yFeet-6,3,2,C.skin)
	rectFill(g,cx-2,yFeet-7,5,1,C.rust)
}
function drawGround(g){
	lineH(g,0,LEG_BOT_Y+1,W,C.ground);lineH(g,0,LEG_BOT_Y+2,W,C.groundHi)
	for(const side of[-2,-1,1,2]){
		const x=LEG_X[side]
		rectFill(g,x-2,LEG_BOT_Y,5,1,C.steelLo)
		rectFill(g,x-2,LEG_BOT_Y+1,5,1,C.steelShade)
	}
}
function drawBeacon(g,on){
	if(!on)return
	const cx=TANK_CX
	rectFill(g,cx-1,3,3,2,C.beaconHi)
	for(const[x,y]of[[cx-2,2],[cx+2,2],[cx-3,3],[cx+3,3],[cx-3,4],[cx+3,4],[cx-2,5],[cx+2,5]])put(g,x,y,C.beaconLo)
	put(g,cx,0,C.beaconHi);put(g,cx-4,1,C.beaconLo);put(g,cx+4,1,C.beaconLo)
}
function buildAll(rung,beacon){
	const g=makeGrid()
	drawFinial(g);drawLegs(g);fillTank(g);drawLabel(g);drawCatwalk(g)
	drawBraces(g);const lad=drawLadder(g,rung);drawClimber(g,lad,rung)
	drawGround(g);drawBeacon(g,beacon);return collapseToRects(g)
}
function collapseToRects(g){
	const out=[]
	for(let y=0;y<H;y++){
		const row=g[y];let runStart=-1,runC=null
		for(let x=0;x<W;x++){
			const c=row[x]
			if(c!==runC){if(runC)out.push({x:runStart,y,w:x-runStart,c:runC});runC=c;runStart=x}
		}
		if(runC)out.push({x:runStart,y,w:W-runStart,c:runC})
	}
	return out
}

function TowerSprite({ rung=0, shake=false, beacon=false, scale=5 }) {
	const rects = useMemo(() => buildAll(rung, beacon), [rung, beacon])
	const [shakeXY, setShakeXY] = useState([0,0])
	useEffect(() => {
		if(!shake){setShakeXY([0,0]);return}
		let i=0
		const seq=[[-2,1],[2,-1],[-1,2],[1,-2],[-2,0],[2,0],[0,0]]
		const id=setInterval(()=>{
			setShakeXY(seq[i]||[0,0]);i++
			if(i>=seq.length){clearInterval(id);setShakeXY([0,0])}
		},50)
		return()=>clearInterval(id)
	},[shake])
	return (
		<svg
			width={W*scale} height={H*scale}
			viewBox={`0 0 ${W} ${H}`}
			shapeRendering="crispEdges"
			style={{
				imageRendering:'pixelated',
				transform:`translate(${shakeXY[0]}px,${shakeXY[1]}px)`,
				filter:shake?'hue-rotate(-30deg) saturate(1.6) brightness(0.95)':'none',
				transition:'filter 80ms linear',
			}}
		>
			{rects.map((r,i)=>(
				<rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c}/>
			))}
			{beacon&&(
				<circle cx={48} cy={4} r={6} fill="#FFEAA6" opacity="0.22">
					<animate attributeName="r" values="5;9;5" dur="0.9s" repeatCount="indefinite"/>
					<animate attributeName="opacity" values="0.18;0.34;0.18" dur="0.9s" repeatCount="indefinite"/>
				</circle>
			)}
		</svg>
	)
}

// legacy name alias so no other references need changing
function PixelTower({ correctCount, shake }) {
	const RUNGS = QUESTION_COUNT
	const RUNG_BOT = 470
	const RUNG_TOP = 320
	const RUNG_SPACING = (RUNG_BOT - RUNG_TOP) / (RUNGS - 1)
	const getRungY = (i) => RUNG_BOT - i * RUNG_SPACING
	const climberRung = Math.max(0, correctCount - 1)
	const climberY = getRungY(climberRung) - 20

	return (
		<svg
			width="170"
			height="520"
			viewBox="0 0 340 520"
			shapeRendering="crispEdges"
			style={{
				display: 'block',
				animation: shake ? 'towerShake 0.4s ease' : 'none',
				filter: shake ? 'drop-shadow(0 0 6px #d65656)' : 'none',
				transition: 'filter 0.3s',
			}}
		>
			{/* === VENT CAP === */}
			<rect x="162" y="26" width="16" height="4" fill="#4a4f60"/>
			<rect x="158" y="30" width="24" height="4" fill="#5e6470"/>
			<rect x="154" y="34" width="32" height="4" fill="#6a6f80"/>
			<rect x="158" y="38" width="24" height="4" fill="#6a6f80"/>

			{/* === BEACON === */}
			{correctCount === RUNGS ? (
				<>
					<rect x="162" y="14" width="16" height="12" fill="#f0a04b"/>
					<rect x="158" y="18" width="4"  height="4"  fill="#c4533a"/>
					<rect x="178" y="18" width="4"  height="4"  fill="#c4533a"/>
					<rect x="162" y="10" width="4"  height="4"  fill="#ffcf78"/>
					<rect x="178" y="10" width="4"  height="4"  fill="#ffcf78"/>
					<rect x="166" y="6"  width="8"  height="4"  fill="#ffcf78"/>
				</>
			) : (
				<rect x="162" y="14" width="16" height="12" fill="#2a2f3e"/>
			)}

			{/* === TOP CAP — widens from 40px to 200px over 40px === */}
			<rect x="150" y="42"  width="40"  height="4" fill="#d0d3de"/>
			<rect x="138" y="46"  width="64"  height="4" fill="#cccfd8"/>
			<rect x="126" y="50"  width="88"  height="4" fill="#c8cbd2"/>
			<rect x="114" y="54"  width="112" height="4" fill="#c4c7ce"/>
			<rect x="104" y="58"  width="132" height="4" fill="#c0c3ca"/>
			<rect x="96"  y="62"  width="148" height="4" fill="#bcbfc6"/>
			<rect x="88"  y="66"  width="164" height="4" fill="#b8bbc2"/>
			<rect x="82"  y="70"  width="176" height="4" fill="#b4b7be"/>
			<rect x="78"  y="74"  width="184" height="4" fill="#b0b3ba"/>
			<rect x="74"  y="78"  width="192" height="4" fill="#acafb6"/>
			<rect x="74"  y="66"  width="8"   height="16" fill="#cfd2dc"/>

			{/* === STRAIGHT SIDES — y=82..186, 200px wide === */}
			<rect x="70" y="82"  width="200" height="104" fill="#a0a4ae"/>
			<rect x="70" y="82"  width="8"   height="104" fill="#b8bcc6"/>
			<rect x="262" y="82" width="8"   height="104" fill="#828690"/>

			{/* === ROCKWOOD lettering — 8 letters × 16px + 7 gaps × 4px = 156px, centered in 200px → start x=88 === */}
			{/* R — outer left edge fades to hint curvature */}
			<rect x="88"  y="122" width="4"  height="12" fill="#1a1c2a" opacity="0.45"/>
			<rect x="92"  y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="96"  y="122" width="8"  height="4"  fill="#1a1c2a"/>
			<rect x="104" y="126" width="4"  height="4"  fill="#1a1c2a"/>
			<rect x="96"  y="130" width="8"  height="4"  fill="#1a1c2a"/>
			<rect x="100" y="134" width="8"  height="4"  fill="#1a1c2a"/>
			{/* O */}
			<rect x="112" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="128" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="116" y="122" width="12" height="4"  fill="#1a1c2a"/>
			<rect x="116" y="130" width="12" height="4"  fill="#1a1c2a"/>
			{/* C */}
			<rect x="136" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="140" y="122" width="8"  height="4"  fill="#1a1c2a"/>
			<rect x="140" y="130" width="8"  height="4"  fill="#1a1c2a"/>
			{/* K */}
			<rect x="152" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="156" y="126" width="4"  height="4"  fill="#1a1c2a"/>
			<rect x="160" y="122" width="4"  height="4"  fill="#1a1c2a"/>
			<rect x="160" y="130" width="4"  height="4"  fill="#1a1c2a"/>
			{/* W */}
			<rect x="168" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="184" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="172" y="130" width="4"  height="4"  fill="#1a1c2a"/>
			<rect x="180" y="130" width="4"  height="4"  fill="#1a1c2a"/>
			<rect x="176" y="134" width="4"  height="4"  fill="#1a1c2a"/>
			{/* O */}
			<rect x="192" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="208" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="196" y="122" width="12" height="4"  fill="#1a1c2a"/>
			<rect x="196" y="130" width="12" height="4"  fill="#1a1c2a"/>
			{/* O */}
			<rect x="216" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="232" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="220" y="122" width="12" height="4"  fill="#1a1c2a"/>
			<rect x="220" y="130" width="12" height="4"  fill="#1a1c2a"/>
			{/* D — outer right edge fades to hint curvature */}
			<rect x="240" y="122" width="4"  height="12" fill="#1a1c2a"/>
			<rect x="244" y="122" width="8"  height="4"  fill="#1a1c2a"/>
			<rect x="252" y="126" width="4"  height="4"  fill="#1a1c2a" opacity="0.7"/>
			<rect x="256" y="126" width="4"  height="4"  fill="#1a1c2a" opacity="0.25"/>
			<rect x="252" y="130" width="4"  height="4"  fill="#1a1c2a" opacity="0.7"/>
			<rect x="256" y="130" width="4"  height="4"  fill="#1a1c2a" opacity="0.25"/>
			<rect x="244" y="130" width="8"  height="4"  fill="#1a1c2a"/>

			{/* === BOTTOM CURVE — narrows from 200px over 40px === */}
			<rect x="70"  y="186" width="200" height="4" fill="#989ba4"/>
			<rect x="72"  y="190" width="196" height="4" fill="#94979e"/>
			<rect x="76"  y="194" width="188" height="4" fill="#909398"/>
			<rect x="82"  y="198" width="176" height="4" fill="#8c8f92"/>
			<rect x="90"  y="202" width="160" height="4" fill="#888b8c"/>
			<rect x="100" y="206" width="140" height="4" fill="#848788"/>
			<rect x="112" y="210" width="116" height="4" fill="#808384"/>
			<rect x="126" y="214" width="88"  height="4" fill="#7c7f80"/>
			<rect x="140" y="218" width="60"  height="4" fill="#78797c"/>
			<rect x="152" y="222" width="36"  height="4" fill="#747578"/>

			{/* === CATWALK — y=226, right at base of bottom curve === */}
			<rect x="58"  y="226" width="224" height="4"  fill="#383d4a"/>
			<rect x="54"  y="230" width="232" height="4"  fill="#4a4f60"/>
			<rect x="50"  y="234" width="240" height="4"  fill="#535870"/>
			<rect x="54"  y="238" width="232" height="4"  fill="#4a4f60"/>
			<rect x="58"  y="242" width="224" height="4"  fill="#383d4a"/>
			{/* X-lattice */}
			{[58,74,90,106,122,138,154,170,186,202,218,234,250,266].map((x, i) => (
				<g key={i}>
					<rect x={x}   y="230" width="4" height="4" fill="#5e6470"/>
					<rect x={x+8} y="230" width="4" height="4" fill="#5e6470"/>
					<rect x={x}   y="238" width="4" height="4" fill="#5e6470"/>
					<rect x={x+8} y="238" width="4" height="4" fill="#5e6470"/>
				</g>
			))}

			{/* === 6 LEGS — no skirt, attach at y=246 === */}
			{[76, 102, 130, 178, 204, 230].map((x, i) => (
				<g key={i}>
					<rect x={x}    y="246" width="16" height="210" fill={i % 2 === 0 ? '#6a6f80' : '#5e6470'}/>
					<rect x={x}    y="246" width="4"  height="210" fill={i % 2 === 0 ? '#7a7f90' : '#6e6e80'}/>
					<rect x={x+12} y="246" width="4"  height="210" fill="#4a4f60"/>
				</g>
			))}

			{/* === CROSS BRACING === */}
			{[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
				<g key={`ta${i}`}>
					<rect x={76  + i*13} y={262 + i*7} width="8" height="4" fill="#4a4f60"/>
					<rect x={242 - i*13} y={262 + i*7} width="8" height="4" fill="#4a4f60"/>
				</g>
			))}
			{[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
				<g key={`tb${i}`}>
					<rect x={76  + i*13} y={356 + i*6} width="8" height="4" fill="#383d4a"/>
					<rect x={242 - i*13} y={356 + i*6} width="8" height="4" fill="#383d4a"/>
				</g>
			))}

			{/* === BASE PLATFORM === */}
			<rect x="64"  y="454" width="212" height="8"  fill="#383d4a"/>
			<rect x="60"  y="462" width="220" height="6"  fill="#2a2f3e"/>
			<rect x="56"  y="468" width="228" height="4"  fill="#1f2230"/>

			{/* === LADDER rails === */}
			<rect x="36" y="234" width="4" height="228" fill="#1f2230"/>
			<rect x="48" y="234" width="4" height="228" fill="#1f2230"/>

			{/* === RUNGS === */}
			{Array.from({ length: RUNGS }).map((_, i) => {
				const y = Math.round(getRungY(i))
				const lit = i < correctCount
				return (
					<rect key={i} x="36" y={y} width="16" height="4"
						fill={lit ? '#f0a04b' : '#2a2f3e'}
						style={{ transition: 'fill 0.3s' }}
					/>
				)
			})}

			{/* === CLIMBER === */}
			{correctCount > 0 && (
				<g>
					<rect x="40" y={Math.round(climberY)}      width="8" height="8"  fill="#f0a04b"/>
					<rect x="40" y={Math.round(climberY) + 8}  width="8" height="8"  fill="#4a2654"/>
					<rect x="36" y={Math.round(climberY) + 8}  width="4" height="4"  fill="#f0a04b"/>
					<rect x="52" y={Math.round(climberY) + 8}  width="4" height="4"  fill="#f0a04b"/>
					<rect x="40" y={Math.round(climberY) + 16} width="4" height="4"  fill="#251c45"/>
					<rect x="44" y={Math.round(climberY) + 16} width="4" height="4"  fill="#251c45"/>
				</g>
			)}
		</svg>
	)
}
// ---------------------------------------------------------------------------
// Timer bar
// ---------------------------------------------------------------------------
function TimerBar({ timeLeft, maxTime }) {
	const pct = (timeLeft / maxTime) * 100
	const color = pct > 60 ? '#6cc36a' : pct > 30 ? '#f0a04b' : '#d65656'
	return (
		<div style={{
			width: '100%', height: '6px',
			background: '#1f2230',
			borderRadius: '3px',
			overflow: 'hidden',
			marginBottom: '20px',
		}}>
			<div style={{
				height: '100%',
				width: `${pct}%`,
				background: color,
				borderRadius: '3px',
				transition: 'width 0.25s linear, background 0.4s',
			}} />
		</div>
	)
}

// ---------------------------------------------------------------------------
// Option button
// ---------------------------------------------------------------------------
function OptionButton({ label, state, onClick }) {
	// state: 'idle' | 'correct' | 'wrong' | 'missed' | 'disabled'
	const colors = {
		idle: { bg: '#1f2230', border: '#383d4a', text: '#cfd2dc', hover: '#251c45' },
		correct: { bg: '#1a3a1a', border: '#6cc36a', text: '#6cc36a', hover: '#1a3a1a' },
		wrong: { bg: '#3a1a1a', border: '#d65656', text: '#d65656', hover: '#3a1a1a' },
		missed: { bg: '#1a2a1a', border: '#4a5a4a', text: '#6cc36a', hover: '#1a2a1a' },
		disabled: { bg: '#1f2230', border: '#2a2f3e', text: '#5e6470', hover: '#1f2230' },
	}
	const c = colors[state] || colors.idle
	return (
		<button
			onClick={state === 'idle' ? onClick : undefined}
			style={{
				width: '100%',
				padding: '12px 16px',
				marginBottom: '10px',
				background: c.bg,
				border: `1px solid ${c.border}`,
				borderRadius: '4px',
				color: c.text,
				fontFamily: "'Inter', sans-serif",
				fontSize: '14px',
				textAlign: 'left',
				cursor: state === 'idle' ? 'pointer' : 'default',
				transition: 'all 0.2s',
				letterSpacing: '0.02em',
			}}
			onMouseEnter={e => state === 'idle' && (e.currentTarget.style.background = c.hover)}
			onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
		>
			{label}
		</button>
	)
}

// ---------------------------------------------------------------------------
// Score tally display
// ---------------------------------------------------------------------------
function ScoreTally({ score, correct, total, streak }) {
	return (
		<div style={{
			display: 'flex',
			gap: '20px',
			marginBottom: '24px',
			fontFamily: "'Silkscreen', monospace",
			fontSize: '11px',
		}}>
			<div>
				<div style={{ color: '#5e6470', marginBottom: '2px' }}>SCORE</div>
				<div style={{ color: '#ffcf78', fontSize: '16px' }}>{score}</div>
			</div>
			<div>
				<div style={{ color: '#5e6470', marginBottom: '2px' }}>CORRECT</div>
				<div style={{ color: '#6cc36a' }}>{correct}/{total}</div>
			</div>
			{streak > 1 && (
				<div>
					<div style={{ color: '#5e6470', marginBottom: '2px' }}>STREAK</div>
					<div style={{ color: '#f0a04b' }}>{streak}x</div>
				</div>
			)}
		</div>
	)
}

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','Enter']

const todayUTC = () => new Date().toISOString().slice(0, 10)
const DAILY_DONE_KEY = (date) => `tower_daily_${date}`

// ---------------------------------------------------------------------------
// Leaderboard view
// ---------------------------------------------------------------------------
function Leaderboard({ onBack }) {
	const [tab, setTab] = useState('today')          // today | alltime
	const [entries, setEntries] = useState(null)

	useEffect(() => {
		let cancelled = false
		const url = tab === 'today'
			? `/tower/leaderboard?limit=20&daily_seed=${todayUTC()}`
			: '/tower/leaderboard?limit=20'
		client.get(url)
			.then(res => { if (!cancelled) setEntries(res.data.entries) })
			.catch(() => { if (!cancelled) setEntries([]) })
		return () => { cancelled = true }
	}, [tab])

	const tabStyle = (active) => ({
		flex: 1,
		padding: '10px 0',
		background: active ? '#1f2230' : 'transparent',
		border: `1px solid ${active ? '#f0a04b' : '#383d4a'}`,
		borderRadius: '4px',
		color: active ? '#ffcf78' : '#9097a3',
		fontFamily: "'Silkscreen', monospace",
		fontSize: '10px',
		letterSpacing: '1px',
		cursor: 'pointer',
		transition: 'all 0.2s',
	})

	return (
		<div>
			<div style={{
				fontFamily: "'Silkscreen', monospace",
				fontSize: '10px',
				color: '#5e6470',
				letterSpacing: '2px',
				marginBottom: '8px',
			}}>LEADERBOARD</div>

			<div style={{ display: 'flex', gap: '10px', margin: '16px 0 20px' }}>
				<button style={tabStyle(tab === 'today')} onClick={() => { setEntries(null); setTab('today') }}>TODAY</button>
				<button style={tabStyle(tab === 'alltime')} onClick={() => { setEntries(null); setTab('alltime') }}>ALL TIME</button>
			</div>

			{entries && entries.length === 0 && (
				<div style={{
					fontFamily: "'Silkscreen', monospace",
					fontSize: '10px',
					color: '#5e6470',
					letterSpacing: '1px',
					padding: '30px 0',
					textAlign: 'center',
				}}>NO SCORES YET</div>
			)}

			{entries && entries.length > 0 && (
				<div>
					<div style={{
						display: 'grid',
						gridTemplateColumns: '36px 1fr 70px 64px',
						gap: '8px',
						padding: '0 12px 8px',
						fontFamily: "'Silkscreen', monospace",
						fontSize: '9px',
						color: '#5e6470',
						letterSpacing: '1px',
					}}>
						<span>#</span><span>PLAYER</span>
						<span style={{ textAlign: 'right' }}>SCORE</span>
						<span style={{ textAlign: 'right' }}>HIT</span>
					</div>
					{entries.map(e => (
						<div key={e.rank} style={{
							display: 'grid',
							gridTemplateColumns: '36px 1fr 70px 64px',
							gap: '8px',
							alignItems: 'center',
							padding: '8px 12px',
							marginBottom: '6px',
							background: '#1f2230',
							border: '1px solid #383d4a',
							borderRadius: '4px',
							fontFamily: "'Inter', sans-serif",
							fontSize: '13px',
						}}>
							<span style={{
								fontFamily: "'Silkscreen', monospace",
								fontSize: '10px',
								color: e.rank <= 3 ? '#ffcf78' : '#5e6470',
							}}>{e.rank}</span>
							<span style={{
								color: '#cfd2dc',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}>{e.player_name}</span>
							<span style={{ color: '#ffcf78', textAlign: 'right' }}>{e.score}</span>
							<span style={{ color: '#9097a3', textAlign: 'right' }}>{e.correct}/{e.total}</span>
						</div>
					))}
				</div>
			)}

			<button
				onClick={onBack}
				style={{
					marginTop: '16px',
					fontFamily: "'Silkscreen', monospace",
					fontSize: '11px',
					letterSpacing: '1px',
					padding: '12px 28px',
					background: 'transparent',
					border: '1px solid #383d4a',
					borderRadius: '4px',
					color: '#9097a3',
					cursor: 'pointer',
					transition: 'all 0.2s',
				}}
				onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0a04b'; e.currentTarget.style.color = '#cfd2dc' }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = '#383d4a'; e.currentTarget.style.color = '#9097a3' }}
			>
				BACK
			</button>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Main Tower page component
// ---------------------------------------------------------------------------
export default function Tower() {
	const [phase, setPhase] = useState('landing')    // landing | loading | playing | results | leaderboard
	const [questions, setQuestions] = useState([])
	const [currentIdx, setCurrentIdx] = useState(0)
	const [selected, setSelected] = useState(null)   // the option the user picked
	const [score, setScore] = useState(0)
	const [correct, setCorrect] = useState(0)
	const [streak, setStreak] = useState(0)
	const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
	const [shake, setShake] = useState(false)
	const [victoryKey, setVictoryKey] = useState(0)
	const [playerName, setPlayerName] = useState('')
	const [submitted, setSubmitted] = useState(false)
	const [error, setError] = useState(null)
	const [dailySeed, setDailySeed] = useState(null)     // ISO date string when playing the daily challenge
	const [cheatUsed, setCheatUsed] = useState(false)
	const [lbReturn, setLbReturn] = useState('landing')  // phase to return to from leaderboard

	const timerRef = useRef(null)
	const graceRef = useRef(null)
	const revealRef = useRef(null)
	const konamiRef = useRef([])
	const tapCountRef = useRef(0)
	const tapTimerRef = useRef(null)

	const currentQ = questions[currentIdx] || null

	// ---------------------------------------------------------------------------
	// Timer logic
	// ---------------------------------------------------------------------------
	const stopTimer = useCallback(() => {
		if (graceRef.current) clearTimeout(graceRef.current)
		if (timerRef.current) clearInterval(timerRef.current)
	}, [])

	const startTimer = useCallback(() => {
		stopTimer()
		setTimeLeft(TIMER_DURATION)
		graceRef.current = setTimeout(() => {
			timerRef.current = setInterval(() => {
				setTimeLeft(t => {
					if (t <= 1) {
						clearInterval(timerRef.current)
						setSelected('__timeout__')
						return 0
					}
					return t - 1
				})
			}, 1000)
		}, READING_GRACE * 1000)
	}, [stopTimer])

	const triggerCheat = useCallback(() => {
		stopTimer()
		setCheatUsed(true)
		setCorrect(QUESTION_COUNT)
		setScore(MAX_POINTS_PER_Q * QUESTION_COUNT)
		setPhase('results')
	}, [stopTimer])

	const handleTowerTap = useCallback(() => {
		if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
		tapCountRef.current += 1
		if (tapCountRef.current >= 21) {
			tapCountRef.current = 0
			triggerCheat()
			return
		}
		tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 400)
	}, [triggerCheat])

	// ---------------------------------------------------------------------------
	// Load questions
	// ---------------------------------------------------------------------------
	const loadRound = async (daily = false) => {
		setPhase('loading')
		setError(null)
		try {
			const res = await client.get(daily
				? '/tower/daily'
				: `/tower/round?count=${QUESTION_COUNT}`)
			const data = res.data
			setQuestions(data.questions)
			setDailySeed(daily ? data.daily_seed : null)
			setCheatUsed(false)
			setCurrentIdx(0)
			setScore(0)
			setCorrect(0)
			setStreak(0)
			setSelected(null)
			setSubmitted(false)
			setPhase('playing')
		} catch (e) {
			setError('Could not load questions. Is the API running?')
			setPhase('landing')
		}
	}

	// record daily challenge completion so it can't be replayed today
	useEffect(() => {
		if (phase === 'results' && dailySeed) {
			localStorage.setItem(DAILY_DONE_KEY(dailySeed), JSON.stringify({
				score, correct, total: QUESTION_COUNT,
			}))
		}
	}, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

	// Start timer when a new question loads
	useEffect(() => {
		if (phase === 'playing' && currentQ && selected === null) {
			startTimer()
		}
		return stopTimer
	}, [phase, currentIdx, currentQ, selected, startTimer, stopTimer])

	// ---------------------------------------------------------------------------
	// Handle answer selection (or timeout)
	// ---------------------------------------------------------------------------
	useEffect(() => {
		if (selected === null) return
		stopTimer()

		const isCorrect = selected === currentQ?.answer
		const isTimeout = selected === '__timeout__'

		if (isCorrect) {
			const pointsEarned = Math.max(10, Math.round((timeLeft / TIMER_DURATION) * MAX_POINTS_PER_Q))
			setScore(s => s + pointsEarned)
			setCorrect(c => c + 1)
			setStreak(s => s + 1)
		} else {
			setStreak(0)
			if (!isTimeout) {
				setShake(true)
				setTimeout(() => setShake(false), 500)
			}
		}

		// auto-advance after reveal delay
		revealRef.current = setTimeout(() => {
			if (currentIdx + 1 >= QUESTION_COUNT) {
				setPhase('results')
			} else {
				setCurrentIdx(i => i + 1)
				setSelected(null)
			}
		}, REVEAL_DELAY)

		return () => clearTimeout(revealRef.current)
	}, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

	// Fire victory celebration when the player hits a perfect score
	useEffect(() => {
		if (correct >= QUESTION_COUNT) setVictoryKey(k => k + 1)
	}, [correct])

	useEffect(() => {
		const handler = (e) => {
			const seq = konamiRef.current
			if (e.key !== KONAMI[seq.length]) {
				konamiRef.current = e.key === KONAMI[0] ? [e.key] : []
				return
			}
			if (seq.length + 1 === KONAMI.length) {
				konamiRef.current = []
				triggerCheat()
			} else {
				konamiRef.current = [...seq, e.key]
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [triggerCheat])

	// ---------------------------------------------------------------------------
	// Submit score
	// ---------------------------------------------------------------------------
	const handleSubmitScore = async () => {
		if (!playerName.trim()) return
		if (cheatUsed) {
			// cheat-code victories never reach the leaderboard
			setSubmitted(true)
			return
		}
		try {
			await client.post('/tower/score', {
				player_name: playerName.trim(),
				score,
				correct,
				total: QUESTION_COUNT,
				daily_seed: dailySeed,
			})
			setSubmitted(true)
		} catch {
			// silent fail — don't block the experience
			setSubmitted(true)
		}
	}

	// ---------------------------------------------------------------------------
	// Option state for a given option label
	// ---------------------------------------------------------------------------
	const getOptionState = (option) => {
		if (selected === null) return 'idle'
		if (option === currentQ.answer) return 'correct'
		if (option === selected && selected !== '__timeout__') return 'wrong'
		return selected === '__timeout__' ? 'missed' : 'disabled'
	}

	// ---------------------------------------------------------------------------
	// Render phases
	// ---------------------------------------------------------------------------

	const renderLanding = () => {
		let dailyDone = null
		try {
			const raw = localStorage.getItem(DAILY_DONE_KEY(todayUTC()))
			if (raw) dailyDone = JSON.parse(raw)
		} catch { /* corrupt entry — treat as not played */ }

		return (
		<div style={{ textAlign: 'center', padding: '20px 0' }}>
			<div style={{
				fontFamily: "'Pixelify Sans', monospace",
				fontSize: '42px',
				color: '#f4eedd',
				textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
				lineHeight: 1.1,
				marginBottom: '8px',
			}}>THE TOWER</div>
			<div style={{
				fontFamily: "'Inter', sans-serif",
				fontSize: '14px',
				color: '#9097a3',
				marginBottom: '40px',
			}}>
				{QUESTION_COUNT} questions. {TIMER_DURATION} seconds each.<br />
				How well do you know the league?
			</div>
			{error && (
				<div style={{
					fontFamily: "'Silkscreen', monospace",
					fontSize: '10px',
					color: '#d65656',
					marginBottom: '20px',
				}}>{error}</div>
			)}
			<div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
				<button
					onClick={() => loadRound()}
					style={{
						fontFamily: "'Silkscreen', monospace",
						fontSize: '12px',
						letterSpacing: '1px',
						padding: '14px 32px',
						background: '#4a2654',
						border: '1px solid #f0a04b',
						borderRadius: '4px',
						color: '#ffcf78',
						cursor: 'pointer',
						transition: 'all 0.2s',
					}}
					onMouseEnter={e => e.currentTarget.style.background = '#6a2f4d'}
					onMouseLeave={e => e.currentTarget.style.background = '#4a2654'}
				>
					BEGIN CLIMB
				</button>
				{dailyDone ? (
					<div style={{
						fontFamily: "'Silkscreen', monospace",
						fontSize: '10px',
						letterSpacing: '1px',
						padding: '14px 24px',
						background: '#1f2230',
						border: '1px solid #383d4a',
						borderRadius: '4px',
						color: '#9097a3',
						lineHeight: 1.6,
					}}>
						DAILY DONE<br />
						<span style={{ color: '#ffcf78' }}>{dailyDone.score}</span>
						{' '}<span style={{ color: '#6cc36a' }}>{dailyDone.correct}/{dailyDone.total}</span>
					</div>
				) : (
					<button
						onClick={() => loadRound(true)}
						style={{
							fontFamily: "'Silkscreen', monospace",
							fontSize: '12px',
							letterSpacing: '1px',
							padding: '14px 32px',
							background: '#1f2230',
							border: '1px solid #ffcf78',
							borderRadius: '4px',
							color: '#ffcf78',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={e => e.currentTarget.style.background = '#383d4a'}
						onMouseLeave={e => e.currentTarget.style.background = '#1f2230'}
					>
						DAILY CHALLENGE
					</button>
				)}
			</div>
			<button
				onClick={() => { setLbReturn('landing'); setPhase('leaderboard') }}
				style={{
					marginTop: '20px',
					fontFamily: "'Silkscreen', monospace",
					fontSize: '10px',
					letterSpacing: '1px',
					padding: '10px 24px',
					background: 'transparent',
					border: '1px solid #383d4a',
					borderRadius: '4px',
					color: '#9097a3',
					cursor: 'pointer',
					transition: 'all 0.2s',
				}}
				onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0a04b'; e.currentTarget.style.color = '#cfd2dc' }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = '#383d4a'; e.currentTarget.style.color = '#9097a3' }}
			>
				LEADERBOARD
			</button>
		</div>
		)
	}

	const renderLoading = () => (
		<div style={{
			textAlign: 'center',
			padding: '60px 0',
			fontFamily: "'Silkscreen', monospace",
			fontSize: '11px',
			color: '#5e6470',
			letterSpacing: '2px',
		}}>
			LOADING QUESTIONS...
		</div>
	)

	const renderPlaying = () => {
		if (!currentQ) return null
		const isRevealed = selected !== null
		const isTimeout = selected === '__timeout__'

		return (
			<div>
				<ScoreTally score={score} correct={correct} total={currentIdx + (isRevealed ? 1 : 0)} streak={streak} />
				<TimerBar timeLeft={timeLeft} maxTime={TIMER_DURATION} />

				{/* Category + difficulty */}
				<div style={{
					display: 'flex',
					gap: '10px',
					marginBottom: '12px',
					alignItems: 'center',
				}}>
					<span style={{
						fontFamily: "'Silkscreen', monospace",
						fontSize: '9px',
						color: '#9097a3',
						letterSpacing: '1px',
						textTransform: 'uppercase',
					}}>{currentQ.category}</span>
					<span style={{ color: '#383d4a', fontSize: '10px' }}>•</span>
					<span style={{ color: '#f0a04b', fontSize: '12px' }}>
						{'★'.repeat(currentQ.difficulty)}{'☆'.repeat(3 - currentQ.difficulty)}
					</span>
					<span style={{
						marginLeft: 'auto',
						fontFamily: "'Silkscreen', monospace",
						fontSize: '9px',
						color: '#5e6470',
					}}>{currentIdx + 1} / {QUESTION_COUNT}</span>
				</div>

				{/* Question */}
				<div style={{
					fontFamily: "'Inter', sans-serif",
					fontSize: '16px',
					color: '#cfd2dc',
					lineHeight: 1.5,
					marginBottom: '24px',
					minHeight: '52px',
				}}>
					{currentQ.question}
				</div>

				{/* Options */}
				{currentQ.options.map((opt) => (
					<OptionButton
						key={opt}
						label={opt}
						state={isRevealed ? getOptionState(opt) : 'idle'}
						onClick={() => setSelected(opt)}
					/>
				))}

				{/* Flavor text on reveal */}
				{isRevealed && (
					<div style={{
						marginTop: '16px',
						padding: '10px 14px',
						background: '#0d0f18',
						border: '1px solid #1f2230',
						borderRadius: '4px',
						fontFamily: "'Inter', sans-serif",
						fontSize: '12px',
						color: '#9097a3',
					}}>
						{isTimeout
							? <span style={{ color: '#d65656' }}>Time's up! </span>
							: selected === currentQ.answer
								? <span style={{ color: '#6cc36a' }}>Correct! </span>
								: <span style={{ color: '#d65656' }}>Wrong. </span>
						}
						{currentQ.flavor}
					</div>
				)}
			</div>
		)
	}

	const renderResults = () => {
		const floors = correct
		const maxScore = QUESTION_COUNT * MAX_POINTS_PER_Q
		const grade = score >= maxScore * 0.9 ? 'SUMMIT'
			: score >= maxScore * 0.7 ? 'NEAR THE TOP'
			: score >= maxScore * 0.5 ? 'HALFWAY UP'
			: score >= maxScore * 0.3 ? 'OFF THE GROUND'
			: 'STAY ON THE GROUND'

		return (
			<div>
				<div style={{
					fontFamily: "'Silkscreen', monospace",
					fontSize: '10px',
					color: '#5e6470',
					letterSpacing: '2px',
					marginBottom: '8px',
				}}>CLIMB COMPLETE</div>

				<div style={{
					fontFamily: "'Pixelify Sans', monospace",
					fontSize: '28px',
					color: '#ffcf78',
					textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
					marginBottom: '4px',
				}}>{grade}</div>

				<div style={{ display: 'flex', gap: '24px', margin: '24px 0' }}>
					{[
						{ label: 'SCORE', value: score, color: '#ffcf78' },
						{ label: 'CORRECT', value: `${correct}/${QUESTION_COUNT}`, color: '#6cc36a' },
						{ label: 'FLOORS', value: floors, color: '#f0a04b' },
					].map(s => (
						<div key={s.label}>
							<div style={{ fontFamily: "'Silkscreen', monospace", fontSize: '9px', color: '#5e6470', marginBottom: '4px' }}>{s.label}</div>
							<div style={{ fontFamily: "'Pixelify Sans', monospace", fontSize: '26px', color: s.color }}>{s.value}</div>
						</div>
					))}
				</div>

				{/* Score submission */}
				{!submitted ? (
					<div style={{ marginBottom: '24px' }}>
						<div style={{
							fontFamily: "'Silkscreen', monospace",
							fontSize: '10px',
							color: '#9097a3',
							marginBottom: '10px',
							letterSpacing: '1px',
						}}>ENTER YOUR NAME FOR THE LEADERBOARD</div>
						<div style={{ display: 'flex', gap: '10px' }}>
							<input
								type="text"
								maxLength={20}
								placeholder="your name"
								value={playerName}
								onChange={e => setPlayerName(e.target.value)}
								onKeyDown={e => e.key === 'Enter' && handleSubmitScore()}
								style={{
									flex: 1,
									padding: '10px 12px',
									background: '#0d0f18',
									border: '1px solid #383d4a',
									borderRadius: '4px',
									color: '#cfd2dc',
									fontFamily: "'Inter', sans-serif",
									fontSize: '14px',
									outline: 'none',
								}}
							/>
							<button
								onClick={handleSubmitScore}
								disabled={!playerName.trim()}
								style={{
									padding: '10px 20px',
									background: playerName.trim() ? '#4a2654' : '#1f2230',
									border: `1px solid ${playerName.trim() ? '#f0a04b' : '#383d4a'}`,
									borderRadius: '4px',
									color: playerName.trim() ? '#ffcf78' : '#5e6470',
									fontFamily: "'Silkscreen', monospace",
									fontSize: '10px',
									cursor: playerName.trim() ? 'pointer' : 'default',
									letterSpacing: '1px',
									transition: 'all 0.2s',
								}}
							>SUBMIT</button>
						</div>
					</div>
				) : (
					<div style={{
						fontFamily: "'Silkscreen', monospace",
						fontSize: '10px',
						color: '#6cc36a',
						letterSpacing: '1px',
						marginBottom: '24px',
					}}>SCORE SAVED</div>
				)}

				<div style={{ display: 'flex', gap: '12px' }}>
					{[
						{ label: 'CLIMB AGAIN', onClick: () => loadRound() },
						{ label: 'LEADERBOARD', onClick: () => { setLbReturn('results'); setPhase('leaderboard') } },
					].map(b => (
						<button
							key={b.label}
							onClick={b.onClick}
							style={{
								fontFamily: "'Silkscreen', monospace",
								fontSize: '11px',
								letterSpacing: '1px',
								padding: '12px 28px',
								background: 'transparent',
								border: '1px solid #383d4a',
								borderRadius: '4px',
								color: '#9097a3',
								cursor: 'pointer',
								transition: 'all 0.2s',
							}}
							onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0a04b'; e.currentTarget.style.color = '#cfd2dc' }}
							onMouseLeave={e => { e.currentTarget.style.borderColor = '#383d4a'; e.currentTarget.style.color = '#9097a3' }}
						>
							{b.label}
						</button>
					))}
				</div>
			</div>
		)
	}

	// ---------------------------------------------------------------------------
	// Layout
	// ---------------------------------------------------------------------------
	return (
		<Scene>
			{/* Night sky — Tower page only, replaces the photo backdrop */}
			<div className="tower-night-sky" />
			<div className="tower-sky-haze" />
			<div className="tower-moon" />
			<div className="tower-horizon" />

			{/* Ambient FX: stars, shooting star, blimp, train — behind content */}
			<div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
				<TowerFX layer="ambient" ambient />
			</div>

			<TopNav />

			<style>{`
				.tower-night-sky {
					position: absolute; inset: 0;
					background: linear-gradient(180deg,
						#060914   0%,
						#0A0F1C  30%,
						#101a2f  60%,
						#1a2440  82%,
						#2a3458 100%);
					z-index: 1;
				}
				.tower-sky-haze {
					position: absolute; inset: 0;
					pointer-events: none;
					background:
						radial-gradient(220px 220px at 22% 18%, rgba(255,232,168,0.18) 0%, rgba(255,232,168,0.04) 50%, transparent 70%),
						radial-gradient(80% 30% at 50% 100%, rgba(180,140,80,0.10) 0%, transparent 70%);
					z-index: 1;
				}
				.tower-moon {
					position: absolute;
					top: calc(18% - 16px); left: calc(22% - 16px);
					width: 32px; height: 32px;
					background: #F5E6B8;
					box-shadow:
						4px 0 0 #FFFFFF inset,
						0 0 0 4px rgba(255,232,168,0.06),
						0 0 0 8px rgba(255,232,168,0.04);
					image-rendering: pixelated;
					z-index: 2;
					pointer-events: none;
				}
				.tower-moon::before,
				.tower-moon::after {
					content: '';
					position: absolute;
					background: #D9CCA0;
				}
				.tower-moon::before { top: 8px;  left: 16px; width: 4px; height: 4px; }
				.tower-moon::after  { top: 20px; left: 8px;  width: 4px; height: 4px; }
				.tower-horizon {
					position: absolute;
					left: 0; right: 0; bottom: 0;
					height: 38%;
					background: linear-gradient(180deg,
						rgba(20,30,56,0)     0%,
						rgba(10,20,40,0.55) 18%,
						#0a1428             38%,
						#060a18            100%);
					z-index: 2;
					pointer-events: none;
				}
				.tower-horizon::before {
					content: '';
					position: absolute;
					left: 0; right: 0;
					top: 18%;
					height: 8px;
					background: repeating-linear-gradient(
						to right,
						#1a2440 0 32px,
						#16203a 32px 64px,
						#1c2848 64px 112px,
						#142036 112px 160px,
						#1e2a4a 160px 208px,
						#182238 208px 256px
					);
					box-shadow: 0 8px 0 #0a1428, 0 16px 0 #060a18;
				}
				.tower-horizon::after {
					content: '';
					position: absolute;
					left: 0; right: 0;
					top: 50%;
					height: 6px;
					background: repeating-linear-gradient(
						to right,
						transparent 0 12px,
						rgba(40,50,80,0.5) 12px 16px,
						transparent 16px 32px,
						rgba(60,70,100,0.4) 32px 36px
					);
				}
			`}</style>

			{/* Main layout: question panel left, tower right */}
			<div style={{
				position: 'absolute',
				inset: 0,
				zIndex: 10,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				paddingTop: '64px',
				paddingBottom: '24px',
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: '32px',
					width: '100%',
					maxWidth: '820px',
					padding: '0 24px',
				}}>

					{/* Question / content panel */}
					<div style={{
						flex: 1,
						background: 'rgba(10,8,32,0.88)',
						border: '1px solid #251c45',
						borderRadius: '6px',
						padding: '32px',
						backdropFilter: 'blur(4px)',
						minHeight: '440px',
					}}>
						{phase === 'landing' && renderLanding()}
						{phase === 'loading' && renderLoading()}
						{phase === 'playing' && renderPlaying()}
						{phase === 'results' && renderResults()}
						{phase === 'leaderboard' && <Leaderboard onBack={() => setPhase(lbReturn)} />}
					</div>

					{/* Tower column */}
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						paddingTop: '8px',
						gap: '8px',
						flexShrink: 0,
						width: '200px',
					}}>
						<div onClick={handleTowerTap} style={{ lineHeight: 0 }}>
							<TowerSprite
								rung={correct}
								shake={shake}
								beacon={correct === QUESTION_COUNT}
								scale={4}
							/>
						</div>
						{phase === 'playing' && (
							<div style={{
								fontFamily: "'Silkscreen', monospace",
								fontSize: '9px',
								color: '#5e6470',
								letterSpacing: '1px',
								textAlign: 'center',
							}}>
								{correct} / {QUESTION_COUNT}<br />FLOORS
							</div>
						)}
					</div>

				</div>
			</div>

			{/* Victory FX: fireworks + banner plane — in front of content, behind scanlines */}
			<div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
				<TowerFX layer="victory" victory={victoryKey} />
			</div>
		</Scene>
	)
}
