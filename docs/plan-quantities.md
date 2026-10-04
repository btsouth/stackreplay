# Purchased account quantities

Each saved stack subscription can carry an integer quantity from 1 to 10.
Existing plan-list and v2 subscription records without a quantity count as one.
The v2 storage key and distinct legacy plan list remain compatible. Plan-list
edits preserve subscription identities, quantities and local account links.
Discovery can select different plans from one service and specify quantities
for each. Quantity describes purchased accounts, not recorded usage attribution.

Published spend is the exact decimal price times quantity. My Stack, Compare,
Replay stack assessments, recap payment confirmation and its opt-in multiplier
use this total. The recap prorates that total over its selected calendar days
using 30.4 days per month. Entered actual payments remain total payments and are
not multiplied again. Replay links retain quantity independently of account
links. Share cards retain the resulting replay economics or confirmed multiplier.

## Capacity approximation

The subscription replay target accepts the same optional quantity. The legacy
replay and exact optimizer multiply numeric constraint ceilings and the fixed
subscription price by quantity without changing debit rates, model access,
window durations or reset phase. Qualitative and unknown limits remain unknown.
The catalog is never changed. Replay results explicitly disclose the aggregate
capacity assumption, and optimizer candidates use the same arithmetic.

This is an aggregate pool with the original reset schedule. It does not route
atomic requests between independent accounts or give accounts separate reset
anchors. A request too large for a single account may fit the aggregate pool,
and independently staggered account windows can have different availability.
Starting-capacity observations describe the aggregate pool and are not copied
from one account. This is a scenario approximation, not observed provider quota.
The compiled execution model already represents independent pools through
separate bound resource instances. Its explicit instances and observed initial
state are not inferred from saved account quantities.
