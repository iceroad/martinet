import { map } from 'lodash/map';
import { range } from 'lodash/range';
import { random } from 'lodash/random';

console.log('sentinel_1', map(range(0, 10), random));
