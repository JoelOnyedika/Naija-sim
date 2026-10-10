import { CONTACTS } from '@/data/contacts';
import { usePhoneStore } from '@/stores/phoneStore';
import { Btn, Card, Row, Title } from '../ui';

const GROUPS = [['family', 'Family'], ['friend', 'Friends'], ['business', 'Businesses'], ['npc', 'Neighbours']] as const;

export function ContactsApp() {
  return (
    <div className="p-3">
      {GROUPS.map(([g, label]) => (
        <div key={g}>
          <Title>{label}</Title>
          <div className="space-y-2">
            {CONTACTS.filter((c) => c.group === g).map((c) => (
              <Card key={c.id}><Row glyph={c.avatar} title={c.name} sub={c.role} right={<Btn tone="light" onClick={() => { usePhoneStore.getState().setChatWith(c.id); usePhoneStore.getState().openApp('messages'); }}>Message</Btn>} /></Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
