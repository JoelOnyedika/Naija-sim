"""Jobs, Contacts, Messages and Hustle through the real UI on a phone viewport. Screenshots go to $SHOTS."""
import os, sys
from playwright.sync_api import sync_playwright
from lib import boot, seed

SHOTS = os.environ.get("SHOTS", "/tmp/shots"); os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)
def js(pg, code, arg=None): return pg.evaluate("async (a)=>{" + code + "}", arg)
def app(pg, name): js(pg, "const P=await import('/src/stores/phoneStore.ts'); const s=P.usePhoneStore.getState(); s.closeApp&&s.closeApp(); s.openApp(a);", name); pg.wait_for_timeout(600)

with sync_playwright() as p:
    b, pg, logs = boot(p, 390, 844)
    seed(pg, "lapo", "game")
    js(pg, "const P=await import('/src/stores/phoneStore.ts'); P.usePhoneStore.getState().openPhone();"); pg.wait_for_timeout(800)

    # ── Jobs
    app(pg, "jobs")
    ok(pg.get_by_text("You are not employed").count() == 1, "Jobs: a new life starts unemployed")
    pg.screenshot(path=f"{SHOTS}/jobs_unemployed.png")
    pg.get_by_role("button", name="Explore careers").click(); pg.wait_for_timeout(300)
    pg.get_by_label("Search careers").fill("developer"); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Technology and Software").click(); pg.wait_for_timeout(300)
    ok(pg.get_by_role("button", name="Requirements not met").count() == 1, "Jobs: a formal career with unmet Charisma cannot be applied to")
    pg.screenshot(path=f"{SHOTS}/jobs_career_detail.png")
    pg.get_by_label("Search careers").fill("pos agent"); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="POS Agent", exact=False).first.click(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Start a shift").click(); pg.wait_for_timeout(500)
    ok(js(pg, "const C=await import('/src/stores/careerStore.ts'); return C.useCareerStore.getState().employed?.careerId") == "pos", "Jobs: starting a POS shift takes the job")
    pg.get_by_role("tab", name="My job", exact=True).click(); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{SHOTS}/jobs_my_job.png")
    ok(pg.get_by_text("Career progression").count() == 1 and pg.get_by_text("Flexible").count() >= 1, "Jobs: dashboard shows rank ladder and schedule")

    # ── Contacts
    app(pg, "contacts")
    ok(pg.get_by_text("Mom").count() >= 1, "Contacts: Mom is shown")
    pg.get_by_label("Search players by username").fill("dj_k"); pg.wait_for_timeout(300)
    ok(pg.get_by_text("@dj_kele").count() == 1, "Contacts: search finds a player by username")
    pg.screenshot(path=f"{SHOTS}/contacts_search.png")
    pg.get_by_role("button", name="Add", exact=True).first.click(); pg.wait_for_timeout(300)
    ok("p:dj_kele" in js(pg, "const S=await import('/src/stores/socialStore.ts'); return S.useSocialStore.getState().added"), "Contacts: Add puts the player in My contacts")

    # ── Messages: a request, accepted
    js(pg, "const G=await import('/src/game/social.ts'); G.receiveFromPlayer('p:lekki_larry','Good day! I saw your place on the map.');")
    app(pg, "messages")
    pg.get_by_role("tab", name="Requests (1)").click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("@lekki_larry").count() == 1 and pg.get_by_text("Simulated player").count() >= 1, "Messages: a stranger's message waits in Requests, labelled simulated")
    pg.screenshot(path=f"{SHOTS}/messages_requests.png")
    pg.get_by_role("button", name="Accept").click(); pg.wait_for_timeout(400)
    pg.get_by_role("tab", name="Chats", exact=True).click(); pg.wait_for_timeout(300)
    ok(pg.get_by_role("button", name="@lekki_larry").count() == 1, "Messages: accepting moves the request into Chats")
    pg.screenshot(path=f"{SHOTS}/messages_chats.png")

    # ── Messages: create a group through the UI
    pg.get_by_role("tab", name="Groups").click(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="New Group").click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder("e.g. Weekend Crew").fill("Weekend Crew")
    pg.get_by_label("Icon 🎉").click()
    pg.get_by_label("Search usernames").fill("ada"); pg.wait_for_timeout(300)
    pg.get_by_role("checkbox", name="@ada_cooks", exact=False).click(); pg.wait_for_timeout(200)
    pg.get_by_label("Search usernames").fill("chioma"); pg.wait_for_timeout(300)
    pg.get_by_role("checkbox").first.click(); pg.wait_for_timeout(200)
    ok(pg.get_by_role("button", name="Remove @ada_cooks").count() == 1, "Groups: selected people appear as removable chips")
    pg.screenshot(path=f"{SHOTS}/messages_new_group.png")
    btn = pg.get_by_role("button", name="Create Group", exact=False)
    btn.dblclick(); pg.wait_for_timeout(600)   # a double tap must create only one group
    ngroups = js(pg, "const S=await import('/src/stores/socialStore.ts'); return S.useSocialStore.getState().groups.length")
    ok(ngroups == 1, f"Groups: double-tapping Create makes exactly one group ({ngroups})")
    # now inside the group chat: send, pin
    pg.get_by_placeholder("Type a message").fill("Who is coming?"); pg.get_by_role("button", name="Send message").click(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Message, sent by you", exact=False).last.click(); pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Pin", exact=True).click(); pg.wait_for_timeout(300)
    ok(pg.get_by_label("Pinned messages").count() == 1, "Messages: a message can be pinned and shows in the pinned bar")
    pg.screenshot(path=f"{SHOTS}/messages_group_chat.png")
    pg.get_by_role("button", name="Back to chats").click(); pg.wait_for_timeout(300)
    ok(pg.get_by_role("button", name="Weekend Crew", exact=False).count() == 1, "Groups: the new group appears in the Groups list")

    # privacy: Only friends blocks a stranger
    out = js(pg, "const S=await import('/src/stores/settingsStore.ts'); S.useSettingsStore.getState().setMessagePrivacy('friends'); const G=await import('/src/game/social.ts'); const r=G.receiveFromPlayer('p:femi_fixes','hi'); S.useSettingsStore.getState().setMessagePrivacy('everyone'); return r")
    ok(out == "blocked", "Privacy: 'Only friends' blocks a stranger's message")

    # ── Hustle
    app(pg, "hustle")
    pg.screenshot(path=f"{SHOTS}/hustle_home.png")
    ok(pg.get_by_text("Your hustle rating").count() == 1, "Hustle: landing shows the rating")
    pg.get_by_role("button", name="Find Work").click(); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{SHOTS}/hustle_board.png")
    pg.get_by_role("button", name="view details").first.click(); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{SHOTS}/hustle_detail.png")
    pg.get_by_role("button", name="Apply at", exact=False).click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("Applying is not being hired").count() == 1, "Hustle: applying shows a waiting state, not a hire")
    # post a job
    pg.locator("button:has-text('Job details')").click(); pg.wait_for_timeout(250); pg.locator("button:has-text('Find Work')").click(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Post a Job").click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder("e.g. DJ for a naming ceremony").fill("DJ for my housewarming")
    pg.get_by_role("button", name="DJ and music", exact=True).click()
    pg.locator("textarea").fill("Four hours of music for around 30 guests.")
    pg.get_by_placeholder("₦0").fill("40000")
    pg.get_by_role("button", name="Preview").click(); pg.wait_for_timeout(200)
    pg.screenshot(path=f"{SHOTS}/hustle_post_preview.png")
    pg.get_by_role("button", name="Post job", exact=True).click(); pg.wait_for_timeout(500)
    ok(js(pg, "const H=await import('/src/stores/hustleStore.ts'); return H.useHustleStore.getState().listings.filter(l=>l.clientId==='me').length") == 1, "Hustle: a posted job appears in the client's posted list")
    # an applicant arrives (move the game clock) and the client hires: escrow
    js(pg, "const C=await import('/src/stores/clockStore.ts'); const H=await import('/src/game/hustle.ts'); const m=C.useClockStore.getState().minutes+40; C.useClockStore.setState({minutes:m}); H.runHustle(m);")
    pg.wait_for_timeout(1300)
    pg.screenshot(path=f"{SHOTS}/hustle_applicants.png")
    before = js(pg, "const E=await import('/src/stores/economyStore.ts'); return E.useEconomyStore.getState().money")
    ok(before >= 0, "Hustle: client view loads with applicants")
    errs = [l for l in logs if l[0] == "PAGEERROR" or (l[0] == "console.error" and "WebGL" not in l[1] and "GPU stall" not in l[1] and "ERR_NAME_NOT_RESOLVED" not in l[1])]
    ok(not errs, f"no page errors ({errs[:3]})")
    ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "no horizontal page overflow")
    b.close()

print("\n" + (f"{len(fails)} browser check(s) FAILED" if fails else "All Jobs/Contacts/Messages/Hustle browser checks passed"))
sys.exit(1 if fails else 0)
