from lib import *
fails=[]
def check(n,c,e=""):
    print(("PASS " if c else "FAIL ")+n,e); 
    if not c: fails.append(n)
with sync_playwright() as p:
    b,pg,logs=boot(p); seed(pg)
    r=pg.evaluate("""async()=>{
      const M=await import('/src/stores/economyStore.ts');M.useEconomyStore.setState({money:50000000});
      const H=await import('/src/game/housing.ts');H.moveInto?0:0;H.acquireProperty('lagos.3-bedroom-flat-ikeja');
      const B=await import('/src/game/buy.ts');const A=await import('/src/game/active.ts');const E=await import('/src/stores/editorStore.ts');
      const I=await import('/src/game/interactions.ts');const L=await import('/src/game/loop.ts');const S=await import('/src/stores/statsStore.ts');const K=await import('/src/stores/skillStore.ts');
      const out={};
      for(const id of ['desk','speaker','disco_light']){B.beginPlace(id);out['placed_'+id]=B.confirmDraft();}
      const home=A.getActiveHome();const desk=home.placed.find(p=>p.defId==='desk');const spk=home.placed.find(p=>p.defId==='speaker');
      I.interactWith(desk); I.startUse(desk); /* tapping now walks first; startUse is what the scene calls on arrival */
      out.midDesk=K.useSkillStore.getState().xp.coding; L.advance(5); out.stillMid=K.useSkillStore.getState().xp.coding;
      L.advance(20); out.afterDesk=K.useSkillStore.getState().xp.coding;
      I.interactWith(spk); I.startUse(spk); out.partyOn=!!S.useStatsStore.getState().activity?.party; L.advance(30); out.partyOff=!S.useStatsStore.getState().activity;
      return out}""")
    print(r)
    check("desk, speaker, disco light all placeable",r["placed_desk"] and r["placed_speaker"] and r["placed_disco_light"])
    check("no XP before the activity finishes",r["midDesk"]==0 and r["stillMid"]==0)
    check("coding XP granted on finish",r["afterDesk"]==10)
    check("party runs then ends",r["partyOn"] and r["partyOff"])
    check("no page errors",not [l for l in logs if l[0]=="PAGEERROR"],[l for l in logs if l[0]=="PAGEERROR"])
    b.close()
print("FAILS:",fails)
